import React, { useEffect, useState } from 'react';
import { X, Archive, Database, HardDrive, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { BackupInfo } from '../types';
import { fetchBackups, triggerManualBackup } from '../services/api';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBackups();
      setBackups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setSuccessMessage(null);
    try {
      const newBackup = await triggerManualBackup();
      setSuccessMessage(`Sauvegarde créée avec succès : ${newBackup.filename}`);
      await loadBackups();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsBackingUp(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Sauvegardes de la Base SQLite</h3>
              <p className="text-[11px] text-slate-400">
                Sauvegarde automatique au démarrage & historique
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">Sauvegarde au Démarrage</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Une copie complète et cohérente de la DB est automatiquement générée à chaque lancement de TestNotes.
              </p>
            </div>
            <button
              onClick={handleManualBackup}
              disabled={isBackingUp}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>En cours...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Fichiers de sauvegarde ({backups.length})</span>
              {isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
            </h4>

            {backups.length === 0 && !isLoading ? (
              <p className="text-xs text-slate-500 italic p-3 text-center">
                Aucune sauvegarde disponible pour le moment.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {backups.map((bk, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            bk.type === 'startup'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          }`}
                        >
                          {bk.type === 'startup' ? 'Démarrage' : 'Manuel'}
                        </span>
                        <span className="font-mono text-slate-200 truncate">{bk.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(bk.createdAt).toLocaleString('fr-FR')}</span>
                        <span>•</span>
                        <span>{Math.round(bk.sizeBytes / 1024)} Ko</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
