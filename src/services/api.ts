import { Note, AppStatus, BackupInfo } from '../types';
import { isTauriEnvironment } from './updater';

const API_BASE = isTauriEnvironment() ? 'http://127.0.0.1:3001/api' : '/api';

export async function fetchStatus(): Promise<AppStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Erreur lors de la récupération du statut');
  return res.json();
}

export async function fetchNotes(): Promise<Note[]> {
  const res = await fetch(`${API_BASE}/notes`);
  if (!res.ok) throw new Error('Impossible de charger les notes');
  const data = await res.json();
  return data.notes || [];
}

export async function createNote(title: string, content: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erreur lors de la création de la note');
  }
  const data = await res.json();
  return data.note;
}

export async function deleteNote(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erreur lors de la suppression');
  }
}

export async function triggerManualBackup(): Promise<BackupInfo> {
  const res = await fetch(`${API_BASE}/backup`, { method: 'POST' });
  if (!res.ok) throw new Error('Échec de la sauvegarde');
  const data = await res.json();
  return data.backup;
}

export async function fetchBackups(): Promise<BackupInfo[]> {
  const res = await fetch(`${API_BASE}/backups`);
  if (!res.ok) throw new Error('Impossible de charger les sauvegardes');
  const data = await res.json();
  return data.backups || [];
}
