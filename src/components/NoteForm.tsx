import React, { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';

interface NoteFormProps {
  onAddNote: (title: string, content: string) => Promise<void>;
  isLoading: boolean;
}

export const NoteForm: React.FC<NoteFormProps> = ({ onAddNote, isLoading }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() && !content.trim()) {
      setError('Veuillez renseigner au moins un titre ou un contenu pour la note.');
      return;
    }

    try {
      await onAddNote(title.trim(), content.trim());
      setTitle('');
      setContent('');
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'enregistrement de la note.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
        Nouvelle note
      </h2>

      {error && (
        <div className="mb-3 p-3 text-xs bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            placeholder="Titre de la note (ex: Idée de projet, Rappel important...)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50"
          />
        </div>

        <div>
          <textarea
            rows={3}
            placeholder="Détails de votre note... (Ctrl + Entrée pour enregistrer)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-y min-h-[85px] disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Astuce : <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">Entrée</kbd> pour valider rapidement
          </span>

          <button
            type="submit"
            disabled={isLoading || (!title.trim() && !content.trim())}
            className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Ajouter la note</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
