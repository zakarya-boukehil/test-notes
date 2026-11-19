import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function build() {
  console.log('[Build Server] Compilation du serveur avec esbuild...');
  await esbuild.build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist-server/index.cjs',
  });
  console.log('[Build Server] Bundle serveur généré : dist-server/index.cjs');

  const binDir = path.join(process.cwd(), 'dist-server', 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Copier le binaire node.exe actuel sous Windows pour rendre l'installateur 100% autonome
  if (process.platform === 'win32') {
    const target = path.join(binDir, 'node.exe');
    if (!fs.existsSync(target) || fs.statSync(target).size !== fs.statSync(process.execPath).size) {
      fs.copyFileSync(process.execPath, target);
      console.log(`[Build Server] Binaire node.exe copié vers ${target} (${(fs.statSync(target).size / (1024 * 1024)).toFixed(1)} MB)`);
    }
  }

  // Copier le dossier des migrations Drizzle SQL dans dist-server
  const drizzleSrc = path.join(process.cwd(), 'drizzle');
  const drizzleDest = path.join(process.cwd(), 'dist-server', 'drizzle');
  if (fs.existsSync(drizzleSrc)) {
    fs.cpSync(drizzleSrc, drizzleDest, { recursive: true });
    console.log(`[Build Server] Dossier drizzle copié vers ${drizzleDest}`);
  }
}

build().catch((err) => {
  console.error('[Build Server] Erreur :', err);
  process.exit(1);
});
