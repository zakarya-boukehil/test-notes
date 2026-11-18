import React, { useState } from 'react';
import { Trash2, Calendar, Clock, Loader2 } from 'lucide-react';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  onDelete: (id: number) => Promise<void>;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      setIsConfirming(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 transition-all duration-200 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-indigo-950/20 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
            {note.title}
          </h3>

          {/* Delete Action */}
          <div className="flex items-center">
            {isConfirming ? (
              <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-800 p-1 rounded-lg">
                <span className="text-[11px] text-rose-200 px-1 font-medium">Confirmer ?</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Oui'}
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  disabled={isDeleting}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirming(true)}
                className="opacity-60 group-hover:opacity-100 p-1.5 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg transition"
                title="Supprimer cette note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Note Content */}
        {note.content && (
          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed mb-4">
            {note.content}
          </p>
        )}
      </div>

      {/* Note Footer metadata */}
      <div className="flex items-center gap-3 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          {formatDate(note.createdAt)}
        </span>
        <span className="text-slate-700">•</span>
        <span className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3 h-3" />
          ID #{note.id}
        </span>
      </div>
    </div>
  );
};
