import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateCheckResult {
  available: boolean;
  currentVersion: string;
  version?: string;
  date?: string;
  body?: string;
  error?: string;
  rawUpdate?: Update | null;
}

/**
 * Vérifie si l'environnement d'exécution est une application native Tauri
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Vérifie la présence de mises à jour via Tauri Updater
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = '1.0.0';

  if (!isTauriEnvironment()) {
    console.info('[Updater] Exécution dans le navigateur web (hors Tauri).');
    return {
      available: false,
      currentVersion,
      error: "Tauri Updater est actif dans l'application native Windows (TestNotes.exe). En mode navigateur web local, le runtime Tauri n'est pas injecté.",
    };
  }

  try {
    const update = await check();
    if (update) {
      return {
        available: true,
        currentVersion,
        version: update.version,
        date: update.date,
        body: update.body || 'Aucune note de version fournie.',
        rawUpdate: update,
      };
    }

    return {
      available: false,
      currentVersion,
    };
  } catch (err: any) {
    console.error('[Updater] Erreur lors de la vérification :', err);
    return {
      available: false,
      currentVersion,
      error: err?.message || String(err) || 'Impossible de vérifier les mises à jour.',
    };
  }
}

/**
 * Télécharge et applique la mise à jour puis redémarre l'application
 */
export async function installUpdateAndRelaunch(
  update: Update,
  onProgress?: (downloaded: number, total: number | undefined) => void
): Promise<void> {
  let downloaded = 0;
  let total: number | undefined = undefined;

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      total = event.data.contentLength;
      onProgress?.(0, total);
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength;
      onProgress?.(downloaded, total);
    } else if (event.event === 'Finished') {
      onProgress?.(downloaded, total);
    }
  });

  // Relance l'application avec la nouvelle version
  await relaunch();
}
