import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Configuration du répertoire des données
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'testnotes.db');

export interface BackupInfo {
  filename: string;
  filepath: string;
  sizeBytes: number;
  createdAt: string;
  type: 'startup' | 'manual';
}

let lastBackupStatus: BackupInfo | null = null;

// Assurer l'existence des répertoires
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// 1. Initialisation de SQLite via le module natif node:sqlite (Node.js 22+)
export const sqlite = new DatabaseSync(DB_PATH);
sqlite.exec('PRAGMA journal_mode = WAL;');

// 2. Initialisation de Drizzle ORM avec le connecteur sqlite-proxy
export const db = drizzle(
  async (sql, params, method) => {
    try {
      const stmt = sqlite.prepare(sql);
      if (method === 'run') {
        stmt.run(...params);
        return { rows: [] };
      } else if (method === 'get') {
        const row = stmt.get(...params);
        return { rows: row ? Object.values(row) : [] };
      } else {
        // all and values
        const rows = stmt.all(...params);
        return { rows: rows.map((r) => Object.values(r)) };
      }
    } catch (err) {
      console.error('[DB Query Error]', err, 'SQL:', sql, 'Params:', params);
      throw err;
    }
  },
  { schema }
);

export { notes } from './schema';

/**
 * Effectue une sauvegarde de la base de données SQLite
 */
export async function performBackup(type: 'startup' | 'manual' = 'manual'): Promise<BackupInfo | null> {
  if (!fs.existsSync(DB_PATH)) {
    console.log(`[Backup] Aucune base existante à sauvegarder pour l'instant (${DB_PATH}).`);
    return null;
  }

  const stat = fs.statSync(DB_PATH);
  if (stat.size === 0) {
    console.log('[Backup] Base de données vide, sauvegarde ignorée.');
    return null;
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFileName = `testnotes_backup_${type}_${timestamp}.db`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  try {
    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
    }
    // Utiliser la fonctionnalité native SQLite VACUUM INTO
    const escapedPath = backupFilePath.replace(/'/g, "''");
    sqlite.exec(`VACUUM INTO '${escapedPath}';`);

    const backupStat = fs.statSync(backupFilePath);
    const backupInfo: BackupInfo = {
      filename: backupFileName,
      filepath: backupFilePath,
      sizeBytes: backupStat.size,
      createdAt: now.toISOString(),
      type,
    };

    lastBackupStatus = backupInfo;
    console.log(`[Backup] ✅ Sauvegarde ${type} réussie (VACUUM INTO) : ${backupFileName} (${backupStat.size} octets)`);

    // Conserver au maximum 10 sauvegardes
    cleanupOldBackups(10);

    return backupInfo;
  } catch (error) {
    console.warn(`[Backup] VACUUM INTO échoué, tentative par copie directe :`, error);
    try {
      fs.copyFileSync(DB_PATH, backupFilePath);
      const backupStat = fs.statSync(backupFilePath);
      const backupInfo: BackupInfo = {
        filename: backupFileName,
        filepath: backupFilePath,
        sizeBytes: backupStat.size,
        createdAt: now.toISOString(),
        type,
      };
      lastBackupStatus = backupInfo;
      console.log(`[Backup] ✅ Sauvegarde de secours (copie) réussie : ${backupFileName}`);
      return backupInfo;
    } catch (fallbackError) {
      console.error('[Backup] ❌ Échec de la sauvegarde :', fallbackError);
      return null;
    }
  }
}

/**
 * Nettoie les anciennes sauvegardes pour ne garder que les N plus récentes
 */
function cleanupOldBackups(maxKeep = 10) {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((file) => file.startsWith('testnotes_backup_') && file.endsWith('.db'))
      .map((file) => ({
        name: file,
        path: path.join(BACKUPS_DIR, file),
        time: fs.statSync(path.join(BACKUPS_DIR, file)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxKeep) {
      const toDelete = files.slice(maxKeep);
      for (const item of toDelete) {
        fs.unlinkSync(item.path);
        console.log(`[Backup] Nettoyage : suppression de l'ancienne sauvegarde ${item.name}`);
      }
    }
  } catch (err) {
    console.warn('[Backup] Avertissement lors du nettoyage des sauvegardes :', err);
  }
}

/**
 * Liste toutes les sauvegardes existantes
 */
export function listBackups(): BackupInfo[] {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    return fs.readdirSync(BACKUPS_DIR)
      .filter((file) => file.startsWith('testnotes_backup_') && file.endsWith('.db'))
      .map((file) => {
        const fullPath = path.join(BACKUPS_DIR, file);
        const stat = fs.statSync(fullPath);
        return {
          filename: file,
          filepath: fullPath,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          type: file.includes('_startup_') ? 'startup' : 'manual',
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function getLastBackupStatus(): BackupInfo | null {
  return lastBackupStatus;
}

/**
 * Initialisation au démarrage : Sauvegarde auto + Migration Drizzle
 */
export async function initializeDatabase() {
  console.log(`[Database] Initialisation de la base SQLite (node:sqlite) : ${DB_PATH}`);

  // Étape 1 : Sauvegarde automatique de la base existante au démarrage
  try {
    await performBackup('startup');
  } catch (err) {
    console.error('[Startup] Erreur lors de la sauvegarde automatique :', err);
  }

  // Étape 2 : Migration Drizzle
  try {
    const migrationsFolder = path.join(process.cwd(), 'drizzle');
    if (fs.existsSync(migrationsFolder)) {
      console.log(`[Migration] Application des migrations Drizzle depuis ${migrationsFolder}...`);
      const sqlFiles = fs.readdirSync(migrationsFolder)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const sqlFile of sqlFiles) {
        const filePath = path.join(migrationsFolder, sqlFile);
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        try {
          sqlite.exec(sqlContent);
        } catch (e: any) {
          // Si la table ou l'index existe déjà, ignorer
          if (!e.message?.includes('already exists')) {
            throw e;
          }
        }
      }
      console.log('[Migration] ✅ Migrations Drizzle appliquées avec succès.');
    } else {
      console.log('[Migration] Dossier drizzle non trouvé, application directe du schéma DDL.');
      applyFallbackSchema();
    }
  } catch (migrationErr) {
    console.warn('[Migration] Note lors de la migration automatique :', migrationErr);
    applyFallbackSchema();
  }
}

function applyFallbackSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
  `);
  console.log('[Migration] ✅ Schéma de secours validé / appliqué.');
}
