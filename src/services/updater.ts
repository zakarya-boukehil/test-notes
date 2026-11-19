import { invoke } from '@tauri-apps/api/core';

export interface UpdateCheckResult {
  available: boolean;
  currentVersion: string;
  version?: string;
  releaseDate?: string;
  body?: string;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
}

const GITHUB_REPO = 'zakarya-boukehil/test-notes';
const CURRENT_VERSION = '1.0.0';

/**
 * Vérifie si l'environnement d'exécution est l'application native Tauri
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Nettoie une chaîne de version (ex: "v1.0.1" -> "1.0.1")
 */
function cleanVersion(v: string): string {
  return v.replace(/^v/i, '').trim();
}

/**
 * Compare deux versions simples (ex: "1.0.1" > "1.0.0")
 */
function isNewerVersion(latest: string, current: string): boolean {
  const lParts = cleanVersion(latest).split('.').map(Number);
  const cParts = cleanVersion(current).split('.').map(Number);

  for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Vérifie les mises à jour directement auprès de l'API GitHub Releases
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          available: false,
          currentVersion: CURRENT_VERSION,
          error: "Aucune publication (Release) n'a encore été trouvée sur ce dépôt GitHub.",
        };
      }
      throw new Error(`Erreur GitHub API (${res.status} ${res.statusText})`);
    }

    const release = await res.json();
    const latestVersion = cleanVersion(release.tag_name || '');

    // Trouver l'exécutable d'installation Windows (.exe) dans les assets
    const exeAsset = Array.isArray(release.assets)
      ? release.assets.find(
          (a: any) =>
            a.name.toLowerCase().endsWith('.exe') &&
            (a.name.toLowerCase().includes('setup') || a.name.toLowerCase().includes('testnotes'))
        ) || release.assets.find((a: any) => a.name.toLowerCase().endsWith('.exe'))
      : null;

    if (!exeAsset) {
      return {
        available: false,
        currentVersion: CURRENT_VERSION,
        error: `Une version ${release.tag_name} existe sur GitHub, mais aucun fichier .exe n'y est attaché.`,
      };
    }

    const newer = isNewerVersion(latestVersion, CURRENT_VERSION);

    return {
      available: newer,
      currentVersion: CURRENT_VERSION,
      version: latestVersion,
      releaseDate: release.published_at,
      body: release.body || 'Nouvelle mise à jour disponible sur GitHub Releases.',
      downloadUrl: exeAsset.browser_download_url,
      fileName: exeAsset.name,
    };
  } catch (err: any) {
    console.error('[Updater] Erreur lors de la vérification :', err);
    return {
      available: false,
      currentVersion: CURRENT_VERSION,
      error: err?.message || 'Impossible de vérifier les mises à jour sur GitHub.',
    };
  }
}

/**
 * Télécharge le nouveau Setup.exe depuis GitHub Releases et l'exécute avec /S (mode silencieux NSIS)
 */
export async function downloadAndExecuteInstaller(
  downloadUrl: string,
  fileName: string = 'TestNotes-Setup.exe',
  onProgress?: (progress: number) => void
): Promise<void> {
  onProgress?.(15);

  const API_BASE = isTauriEnvironment() ? 'http://127.0.0.1:3001/api' : '/api';

  onProgress?.(30);

  // 1. Demande au serveur de télécharger le fichier Setup.exe
  const res = await fetch(`${API_BASE}/update/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ downloadUrl, fileName }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erreur lors du téléchargement du Setup.exe');
  }

  const { filePath } = await res.json();
  onProgress?.(80);

  // 2. Lancement du Setup.exe avec l'argument /S (mode silencieux)
  if (isTauriEnvironment()) {
    onProgress?.(95);
    // Commande native Tauri (lance l'exécutable et quitte l'application)
    await invoke('install_update', { installerPath: filePath });
  } else {
    // Via l'endpoint du serveur Node
    await fetch(`${API_BASE}/update/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installerPath: filePath }),
    });
    onProgress?.(100);
  }
}
