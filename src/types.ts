export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupInfo {
  filename: string;
  filepath: string;
  sizeBytes: number;
  createdAt: string;
  type: 'startup' | 'manual';
}

export interface AppStatus {
  status: string;
  version: string;
  app: string;
  timestamp: string;
  lastBackup: BackupInfo | null;
}
