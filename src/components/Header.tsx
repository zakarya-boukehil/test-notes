import React from 'react';
import { RefreshCw, Database, Sparkles, Archive } from 'lucide-react';
import { AppStatus } from '../types';

interface HeaderProps {
  appStatus: AppStatus | null;
  serverOnline: boolean;
  onCheckUpdates: () => void;
  isCheckingUpdates: boolean;
  onOpenBackups: () => void;
  appVersion?: string;
}

export const Header: React.FC<HeaderProps> = ({
  appStatus,
  serverOnline,
  onCheckUpdates,
  isCheckingUpdates,
  onOpenBackups,
  appVersion,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* App Title & Version Badge */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                TN
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">TestNotes</h1>
              {/* Badge Version dynamique */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Version {appVersion || '1.0.6'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Mini-application Windows sécurisée (Node.js • Hono • Drizzle • node:sqlite • Tauri)
            </p>
          </div>
        </div>

        {/* Action Controls & Status */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Server / DB status pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
              serverOnline
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
            title={serverOnline ? 'Backend Hono & SQLite opérationnels' : 'Connexion au serveur Hono en cours...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <Database className="w-3.5 h-3.5" />
            <span>{serverOnline ? 'SQLite connecté' : 'Serveur déconnecté'}</span>
          </div>

          {/* Bouton Sauvegardes */}
          <button
            onClick={onOpenBackups}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition shadow-sm hover:shadow"
            title="Consulter les sauvegardes automatiques de la DB"
          >
            <Archive className="w-3.5 h-3.5 text-slate-400" />
            <span>Sauvegardes DB</span>
          </button>

          {/* Bouton Vérifier les mises à jour requis */}
          <button
            onClick={onCheckUpdates}
            disabled={isCheckingUpdates}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
            <span>Vérifier les mises à jour</span>
          </button>
        </div>
      </div>
    </header>
  );
};
