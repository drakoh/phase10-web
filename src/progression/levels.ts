import type { Difficulty } from '../engine/ai';

export interface LevelConfig {
  phases: number;
  aiCount: number;
  difficulty: Difficulty;
}

export const LEVELS: LevelConfig[] = [
  { phases: 1, aiCount: 1, difficulty: 'easy' },
  { phases: 1, aiCount: 1, difficulty: 'easy' },
  { phases: 2, aiCount: 1, difficulty: 'easy' },
  { phases: 2, aiCount: 1, difficulty: 'medium' },
  { phases: 3, aiCount: 1, difficulty: 'medium' },
  { phases: 3, aiCount: 2, difficulty: 'medium' },
  { phases: 5, aiCount: 2, difficulty: 'medium' },
  { phases: 5, aiCount: 2, difficulty: 'hard' },
  { phases: 7, aiCount: 2, difficulty: 'hard' },
  { phases: 10, aiCount: 3, difficulty: 'hard' },
];

export const MAX_LEVEL = LEVELS.length;
