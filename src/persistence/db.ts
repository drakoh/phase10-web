import Dexie, { type Table } from 'dexie';

export interface StoredProgress {
  id: string;
  xp: number;
  playerLevel: number;
  currentLevel: number;
  stars: Record<number, number>;
  unlocked: number;
}

export interface StoredSave {
  id: string;
  data: string; // JSON
  createdAt: number;
}

class AppDB extends Dexie {
  progress!: Table<StoredProgress, string>;
  saves!: Table<StoredSave, string>;
  constructor() {
    super('phase10');
    this.version(1).stores({
      progress: 'id',
      saves: 'id, createdAt',
    });
  }
}

export const db = new AppDB();

export async function loadProgressFromDb(): Promise<StoredProgress | null> {
  try {
    return (await db.progress.get('main')) ?? null;
  } catch {
    return null;
  }
}

export async function saveProgressToDb(p: StoredProgress) {
  try { await db.progress.put({ ...p, id: 'main' }); } catch { /* ignore */ }
}

export async function exportProgressJson(): Promise<string> {
  const p = await db.progress.get('main');
  return JSON.stringify(p ?? {}, null, 2);
}

export async function importProgressJson(json: string) {
  const p = JSON.parse(json);
  await db.progress.put({ ...p, id: 'main' });
}