import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { desc, eq } from 'drizzle-orm';
import { db, notes, initializeDatabase, performBackup, listBackups, getLastBackupStatus } from './db';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const app = new Hono();

// Middleware CORS pour autoriser le frontend (Vite & Tauri WebView)
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Route de statut / santé
app.get('/api/status', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.6',
    app: 'TestNotes',
    timestamp: new Date().toISOString(),
    lastBackup: getLastBackupStatus(),
  });
});

// Récupérer toutes les notes
app.get('/api/notes', async (c) => {
  try {
    const allNotes = await db.select().from(notes).orderBy(desc(notes.createdAt));
    return c.json({ success: true, notes: allNotes });
  } catch (error) {
    console.error('Erreur lecture notes :', error);
    return c.json({ success: false, error: 'Impossible de récupérer les notes' }, 500);
  }
});

// Ajouter une note
app.post('/api/notes', async (c) => {
  try {
    const body = await c.req.json();
    const title = (body.title || '').trim();
    const content = (body.content || '').trim();

    if (!title && !content) {
      return c.json({ success: false, error: 'Le titre ou le contenu est requis.' }, 400);
    }

    const now = new Date().toISOString();
    const inserted = await db
      .insert(notes)
      .values({
        title: title || 'Sans titre',
        content: content || '',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return c.json({ success: true, note: inserted[0] }, 201);
  } catch (error) {
    console.error('Erreur création note :', error);
    return c.json({ success: false, error: 'Erreur lors de la création de la note' }, 500);
  }
});

// Supprimer une note
app.delete('/api/notes/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ success: false, error: 'ID de note invalide' }, 400);
    }

    const deleted = await db.delete(notes).where(eq(notes.id, id)).returning();
    if (!deleted || deleted.length === 0) {
      return c.json({ success: false, error: 'Note non trouvée' }, 404);
    }

    return c.json({ success: true, deleted: deleted[0] });
  } catch (error) {
    console.error('Erreur suppression note :', error);
    return c.json({ success: false, error: 'Erreur lors de la suppression' }, 500);
  }
});

// Déclencher manuellement une sauvegarde de la DB
app.post('/api/backup', async (c) => {
  try {
    const backup = await performBackup('manual');
    return c.json({ success: true, backup });
  } catch (error) {
    console.error('Erreur sauvegarde manuelle :', error);
    return c.json({ success: false, error: 'Échec de la sauvegarde' }, 500);
  }
});

// Lister les sauvegardes existantes
app.get('/api/backups', (c) => {
  try {
    const backups = listBackups();
    return c.json({ success: true, backups });
  } catch (error) {
    return c.json({ success: false, error: 'Impossible de lister les sauvegardes' }, 500);
  }
});

// Télécharger le Setup.exe depuis GitHub Releases
app.post('/api/update/download', async (c) => {
  try {
    const body = await c.req.json();
    const downloadUrl = body.downloadUrl;
    const fileName = body.fileName || 'TestNotes-Setup.exe';

    if (!downloadUrl) {
      return c.json({ success: false, error: 'downloadUrl est requis' }, 400);
    }

    const tempDir = os.tmpdir();
    const targetPath = path.join(tempDir, fileName);

    console.log(`[Updater] Téléchargement depuis : ${downloadUrl}`);
    console.log(`[Updater] Fichier cible : ${targetPath}`);

    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Échec du téléchargement (${res.status} ${res.statusText})`);
    }

    const buffer = await res.arrayBuffer();
    fs.writeFileSync(targetPath, Buffer.from(buffer));
    console.log(`[Updater] Téléchargement terminé (${buffer.byteLength} octets)`);

    return c.json({ success: true, filePath: targetPath, size: buffer.byteLength });
  } catch (error: any) {
    console.error('[Updater] Erreur téléchargement :', error);
    return c.json({ success: false, error: error?.message || 'Erreur lors du téléchargement' }, 500);
  }
});

// Exécuter l'installateur avec l'argument /S (mode silencieux NSIS)
app.post('/api/update/execute', async (c) => {
  try {
    const body = await c.req.json();
    const installerPath = body.installerPath;

    if (!installerPath || !fs.existsSync(installerPath)) {
      return c.json({ success: false, error: 'Installateur introuvable' }, 400);
    }

    console.log(`[Updater] Exécution de l'installateur : ${installerPath} /S`);
    const child = spawn(installerPath, ['/S'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    setTimeout(() => {
      process.exit(0);
    }, 800);

    return c.json({ success: true, message: 'Installateur lancé en mode silencieux' });
  } catch (error: any) {
    console.error('[Updater] Erreur exécution :', error);
    return c.json({ success: false, error: error?.message || 'Erreur lancement installateur' }, 500);
  }
});

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  // 1. Sauvegarde automatique et migrations Drizzle au démarrage
  await initializeDatabase();

  // 2. Démarrage du serveur HTTP Hono
  serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      console.log(`[TestNotes Server] Hono en écoute sur http://127.0.0.1:${info.port}`);
    }
  );
}

startServer().catch((err) => {
  console.error('[Server Error]', err);
  process.exit(1);
});
