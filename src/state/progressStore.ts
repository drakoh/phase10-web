import { create } from 'zustand';
import { LEVELS } from '../progression/levels';

interface ProgressState {
  xp: number;
  playerLevel: number;
  currentLevel: number; // 0-based index into LEVELS
  stars: Record<number, number>;
  unlocked: number; // how many levels unlocked (1-based count)
  load: () => void;
  addXp: (amount: number) => void;
  completeLevel: (levelIndex: number, starsEarned: number) => void;
  setCurrentLevel: (i: number) => void;
}

const KEY = 'phase10_progress';

function readStorage(): Partial<ProgressState> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStorage(state: ProgressState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      xp: state.xp,
      playerLevel: state.playerLevel,
      currentLevel: state.currentLevel,
      stars: state.stars,
      unlocked: state.unlocked,
    }));
  } catch { /* ignore */ }
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  xp: 0,
  playerLevel: 1,
  currentLevel: 0,
  stars: {},
  unlocked: 1,
  load: () => {
    const s = readStorage();
    set({
      xp: s.xp ?? 0,
      playerLevel: s.playerLevel ?? 1,
      currentLevel: s.currentLevel ?? 0,
      stars: s.stars ?? {},
      unlocked: s.unlocked ?? 1,
    });
  },
  addXp: (amount) => {
    set((st) => {
      const newXp = st.xp + amount;
      const newLevel = Math.floor(newXp / 200) + 1;
      const next = { ...st, xp: newXp, playerLevel: newLevel };
      writeStorage(next as any);
      return next;
    });
  },
  completeLevel: (levelIndex, starsEarned) => {
    set((st) => {
      const prevStars = st.stars[levelIndex] ?? 0;
      const newStars = Math.max(prevStars, starsEarned);
      const newUnlocked = Math.max(st.unlocked, levelIndex + 2);
      const cappedUnlocked = Math.min(newUnlocked, LEVELS.length);
      const next = {
        ...st,
        stars: { ...st.stars, [levelIndex]: newStars },
        unlocked: cappedUnlocked,
      };
      writeStorage(next as any);
      return next;
    });
    get().addXp(100 + starsEarned * 25);
  },
  setCurrentLevel: (i) => {
    set((st) => {
      const next = { ...st, currentLevel: i };
      writeStorage(next as any);
      return next;
    });
  },
}));
