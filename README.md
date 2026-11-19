# 📝 TestNotes (Windows Desktop Mini-App)

Mini-application Windows moderne pour la prise de notes, développée avec **React 19 + Vite + Tailwind CSS (v4)**, un backend local ultra-rapide **Node.js + Hono + Drizzle ORM + node:sqlite (natif Node 22+)**, et empaquetée en installateur Windows `.exe` via **Tauri v2**.

---

## ✨ Fonctionnalités Principales

- **Badge de version visible en haut** : Affiche fièrement `Version 1.0.0` dans l'en-tête de l'application.
- **Gestion des notes (SQLite locale)** :
  - Ajout rapide de notes (Titre & Contenu) avec raccourci clavier (<kbd>Ctrl</kbd> + <kbd>Entrée</kbd>).
  - Suppression de notes avec confirmation immédiate.
  - Zéro compilation C++ / node-gyp : utilise le module natif `node:sqlite` de Node.js 22+.
- **Sauvegarde automatique et migrations au démarrage** :
  - **Sauvegarde auto** : À chaque lancement du serveur backend, une sauvegarde atomique (VACUUM INTO) est créée dans `data/backups/`.
  - **Migrations Drizzle automatiques** : Drizzle et SQLite appliquent automatiquement les migrations au démarrage.
  - **Panneau de gestion des sauvegardes** : Possibilité de consulter l'historique des sauvegardes et de déclencher une sauvegarde manuelle à tout moment.
- **Mise à jour en un clic (Tauri Updater)** :
  - Bouton **"Vérifier les mises à jour"** dans l'en-tête de l'application.
  - Utilise le plugin natif `@tauri-apps/plugin-updater` pour interroger `latest.json` sur les GitHub Releases du dépôt.
  - Téléchargement, installation et relance automatique de la nouvelle version.
- **Intégration CI/CD GitHub Actions** :
  - Workflow automatisé `.github/workflows/release.yml` déclenché lors de la publication d'une Release (`release: types: [published]`).
  - Runner `windows-latest` compilant l'installateur `TestNotes-Setup.exe` et générant le manifeste de signature `latest.json`.
  - Attachement automatique des artefacts à la GitHub Release grâce aux permissions `contents: write`.

---

## 🏗️ Architecture du Projet

```text
test-notes/
├── .github/
│   └── workflows/
│       └── release.yml        # CI/CD GitHub Actions pour Windows (TestNotes-Setup.exe + latest.json)
├── data/                      # Base SQLite locale et sauvegardes automatiques
│   ├── testnotes.db           # Fichier SQLite
│   └── backups/               # Sauvegardes horodatées (startup & manuelles)
├── drizzle/                   # Migrations SQL générées par Drizzle Kit
├── server/                    # Backend Node.js
│   ├── db/
│   │   ├── schema.ts          # Schéma Drizzle (table notes)
│   │   └── index.ts           # Initialisation SQLite, auto-backup & migrations
│   └── index.ts               # Serveur Hono HTTP & API REST (/api/notes, /api/status, etc.)
├── src/                       # Frontend React + Tailwind CSS
│   ├── components/
│   │   ├── Header.tsx         # En-tête avec badge "Version 1.0.0" et boutons d'action
│   │   ├── NoteCard.tsx       # Carte de note avec suppression
│   │   ├── NoteForm.tsx       # Formulaire d'ajout de note
│   │   ├── UpdateModal.tsx    # Modal de vérification/installation de mise à jour Tauri
│   │   └── BackupModal.tsx    # Consultation de l'historique des sauvegardes SQLite
│   ├── services/
│   │   ├── api.ts             # Client API (notes, backups, status)
│   │   └── updater.ts         # Intégration du plugin Tauri Updater
│   ├── App.tsx                # Composant racine
│   └── main.tsx               # Point d'entrée React
├── src-tauri/                 # Configuration et code natif Tauri v2
│   ├── capabilities/
│   │   └── default.json       # Permissions (core, updater, process)
│   ├── src/
│   │   ├── lib.rs             # Configuration Rust de l'application & gestion du serveur enfant
│   │   └── main.rs            # Point d'entrée natif Windows
│   ├── Cargo.toml             # Dépendances Rust (tauri, tauri-plugin-updater, etc.)
│   └── tauri.conf.json        # Configuration Tauri (NSIS installer, updater endpoint, pubkey)
├── drizzle.config.ts          # Configuration Drizzle Kit
├── vite.config.ts             # Configuration Vite avec @tailwindcss/vite et proxy
└── package.json
```

---

## 🚀 Démarrage et Développement

### Prérequis
- [Node.js](https://nodejs.org/) (v20+ ou v22+) et `npm`
- [Rust](https://rustup.rs/) (pour compiler l'application native Tauri)

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancement en mode développement Web
Démarre à la fois le serveur Hono sur le port `3001` et le serveur Vite sur le port `5173` avec rechargement à chaud :
```bash
npm run dev
```
Ouvrez [http://localhost:5173](http://localhost:5173) dans votre navigateur.

### 3. Lancement en mode natif Tauri Desktop
```bash
npm run tauri:dev
```
Ouvre la fenêtre native Windows de l'application connectée au backend Hono et SQLite.

---

## 📦 Compilation de l'Installateur Windows

Pour construire le frontend, empaqueter le serveur et compiler l'installateur Windows `.exe` via Tauri :

```bash
npm run build        # Compile le frontend React (dist) et le serveur Hono (dist-server)
npx tauri build      # Génère l'installateur NSIS Windows (.exe) dans src-tauri/target/release/bundle/nsis/
```

L'installateur produit s'intitule `TestNotes-Setup.exe`.

---

## 🔄 Configuration des Mises à Jour (Tauri Updater)

Le système de mise à jour s'appuie sur la vérification cryptographique des binaires via `minisign` intégré dans Tauri v2.

1. **Clé publique configurée dans `src-tauri/tauri.conf.json`** :
   ```json
   "plugins": {
     "updater": {
       "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEI5ODMwRTZFNjVDOTRBMEIKUldRTFNzbGxiZzZEdVFwM1lYR1c3S1JOTEljVXE3UFpkbXRSNTR3ZHU1ZzU0VjJsQXNQSnFZS0UK",
       "endpoints": [
         "https://github.com/{{owner}}/{{repo}}/releases/latest/download/latest.json"
       ]
     }
   }
   ```
2. **Secrets GitHub Actions requis** (dans **Settings > Secrets and variables > Actions**) :
   - `TAURI_SIGNING_PRIVATE_KEY` : Contenu de la clé privée générée (`updater-key`).
   - `TAURI_SIGNING_KEY_PASSWORD` : Mot de passe de la clé privée (`testnotes-secret-key`).

---

## 🤖 GitHub Actions Workflow (`.github/workflows/release.yml`)

Lorsqu'une nouvelle release est publiée sur GitHub (`release: types: [published]`) :

1. Le runner `windows-latest` récupère le code et configure Node.js ainsi que la chaîne d'outils Rust MSVC.
2. Les dépendances sont installées et le projet est compilé (`npm run build`).
3. Les endpoints du Tauri Updater sont automatiquement reliés au dépôt GitHub actuel (`github.repository`).
4. `tauri build` compile l'application et génère l'installateur NSIS avec sa signature cryptographique.
5. Les deux fichiers requis sont préparés :
   - `TestNotes-Setup.exe` : L'installateur Windows complet pour l'utilisateur.
   - `latest.json` : Le manifeste de métadonnées pour le Tauri Updater (contenant la version, l'URL de téléchargement et la signature).
6. Grâce à `permissions: contents: write`, l'action `softprops/action-gh-release@v2` attache automatiquement `TestNotes-Setup.exe` et `latest.json` à la Release GitHub publiée !
