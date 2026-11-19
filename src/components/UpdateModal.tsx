import React, { useState } from 'react';
import { X, CheckCircle2, Download, AlertCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { UpdateCheckResult, downloadAndExecuteInstaller } from '../services/updater';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: UpdateCheckResult | null;
  isChecking: boolean;
  onRecheck: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  result,
  isChecking,
  onRecheck,
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [installError, setInstallError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInstall = async () => {
    if (!result?.downloadUrl) return;
    setIsInstalling(true);
    setInstallError(null);
    setProgressPercent(10);

    try {
      await downloadAndExecuteInstaller(
        result.downloadUrl,
        result.fileName || 'TestNotes-Setup.exe',
        (p) => setProgressPercent(p)
      );
    } catch (err: any) {
      console.error(err);
      setInstallError(err?.message || 'Erreur lors du téléchargement de la mise à jour.');
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl shadow-indigo-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Gestionnaire de Mises à Jour</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isInstalling}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isChecking ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-200">
                Interrogation des GitHub Releases en cours...
              </p>
              <p className="text-xs text-slate-500">
                Vérification de la dernière version sur GitHub
              </p>
            </div>
          ) : result?.available ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 bg-indigo-950/40 border border-indigo-800/60 rounded-2xl">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Nouvelle version disponible !
                  </h4>
                  <p className="text-xs text-indigo-300">
                    Version <span className="font-semibold text-white">v{result.version}</span> (Actuelle : v{result.currentVersion})
                  </p>
                </div>
              </div>

              {result.body && (
                <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                  <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Notes de publication :
                  </p>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {result.body}
                  </p>
                </div>
              )}

              {/* Progress bar during download */}
              {isInstalling && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Téléchargement & installation silencieuse (/S)...</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {installError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
                  {installError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  disabled={isInstalling}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Installation en cours...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Mettre à jour</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : result?.error ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-semibold text-amber-200">Information</h4>
                  <p className="text-amber-300/80 leading-relaxed">{result.error}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={onRecheck}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <RefreshCw className="w-3 h-3" />
                  Réessayer
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">TestNotes est à jour !</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Vous disposez de la version la plus récente : <span className="font-semibold text-slate-200">v{result?.currentVersion || '1.0.6'}</span>.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                >
                  Parfait
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
