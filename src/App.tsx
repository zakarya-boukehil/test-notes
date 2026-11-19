import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { NoteForm } from './components/NoteForm';
import { NoteCard } from './components/NoteCard';
import { UpdateModal } from './components/UpdateModal';
import { BackupModal } from './components/BackupModal';
import { Note, AppStatus } from './types';
import { fetchNotes, createNote, deleteNote, fetchStatus } from './services/api';
import { checkForAppUpdates, getCurrentAppVersion, FALLBACK_APP_VERSION, UpdateCheckResult } from './services/updater';
import { StickyNote, AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>(FALLBACK_APP_VERSION);

  // Modals state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Charger la version réelle de l'application
  useEffect(() => {
    getCurrentAppVersion().then((v) => {
      if (v) setAppVersion(v);
    });
  }, []);

  // Charger le statut du serveur et les notes avec retries automatiques au démarrage
  const loadData = useCallback(async (retryCount = 0) => {
    if (retryCount === 0) {
      setIsLoadingNotes(true);
      setFetchError(null);
    }
    try {
      const [statusData, notesData] = await Promise.all([
        fetchStatus().catch(() => null),
        fetchNotes().catch((err) => {
          throw err;
        }),
      ]);

      if (statusData) {
        setAppStatus(statusData);
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }

      setNotes(notesData);
      setFetchError(null);
      setIsLoadingNotes(false);
    } catch (err: any) {
      console.warn(`[App] Tentative de connexion serveur (${retryCount + 1}/6)...`, err);
      // Retries automatiques si le serveur Hono démarre
      if (retryCount < 6) {
        setTimeout(() => {
          loadData(retryCount + 1);
        }, 800);
        return;
      }

      setServerOnline(false);
      setIsLoadingNotes(false);
      setFetchError(
        "Impossible de joindre le serveur Hono (port 3001). Assurez-vous que le backend SQLite / Hono est démarré."
      );
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ajouter une note
  const handleAddNote = async (title: string, content: string) => {
    setIsAddingNote(true);
    try {
      const newNote = await createNote(title, content);
      setNotes((prev) => [newNote, ...prev]);
    } finally {
      setIsAddingNote(false);
    }
  };

  // Supprimer une note
  const handleDeleteNote = async (id: number) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Vérifier les mises à jour via GitHub Releases
  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setIsUpdateModalOpen(true);
    try {
      const res = await checkForAppUpdates();
      setUpdateResult(res);
    } catch (err: any) {
      setUpdateResult({
        available: false,
        currentVersion: appVersion,
        error: err?.message || 'Erreur inconnue lors de la vérification.',
      });
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100">
      {/* Header avec Badge de Version et Bouton "Vérifier les mises à jour" */}
      <Header
        appStatus={appStatus}
        serverOnline={serverOnline}
        onCheckUpdates={handleCheckUpdates}
        isCheckingUpdates={isCheckingUpdates}
        onOpenBackups={() => setIsBackupModalOpen(true)}
        appVersion={appVersion}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Connection Error Banner if backend is unreachable */}
        {fetchError && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-center justify-between text-rose-300 text-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        )}

        {/* Section Création de note */}
        <section>
          <NoteForm onAddNote={handleAddNote} isLoading={isAddingNote} />
        </section>

        {/* Section Liste des notes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-slate-200">
                Mes Notes SQLite{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({notes.length} note{notes.length > 1 ? 's' : ''})
                </span>
              </h2>
            </div>
            {notes.length > 0 && (
              <button
                onClick={loadData}
                className="text-xs text-slate-400 hover:text-indigo-400 transition inline-flex items-center gap-1"
                title="Actualiser la liste"
              >
                <RefreshCw className="w-3 h-3" />
                Actualiser
              </button>
            )}
          </div>

          {isLoadingNotes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-slate-900/40 border border-slate-800/60 rounded-2xl animate-pulse p-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-800/60 rounded w-full"></div>
                    <div className="h-3 bg-slate-800/40 rounded w-1/2"></div>
                  </div>
                  <div className="h-3 bg-slate-800/50 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-900/30 border border-dashed border-slate-800/80 rounded-3xl">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <StickyNote className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                Aucune note enregistrée
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Ajoutez votre première note ci-dessus. Elle sera immédiatement persistée dans votre base de données SQLite locale avec Drizzle ORM.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} onDelete={handleDeleteNote} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          TestNotes • Node.js + Hono + Drizzle ORM + node:sqlite + React + Vite + Tailwind + Tauri
        </p>
      </footer>

      {/* Modal Mise à jour (Tauri Updater) */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        result={updateResult}
        isChecking={isCheckingUpdates}
        onRecheck={handleCheckUpdates}
      />

      {/* Modal Sauvegardes SQLite */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
};

export default App;
