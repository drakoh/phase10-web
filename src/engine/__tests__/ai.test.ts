import { describe, it, expect } from 'vitest';
import { createRound, applyAction } from '../rules';
import { chooseAction } from '../ai';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function playGame(seed: number): string {
  const players = [
    { id: 'expert', name: 'X', isHuman: false, phaseIndex: 0, hand: [] },
    { id: 'easy', name: 'E', isHuman: false, phaseIndex: 0, hand: [] },
  ];
  const r0 = rng(seed);
  let round = createRound(players as any, 0, r0);
  const diff: Record<string, 'expert' | 'easy'> = { expert: 'expert', easy: 'easy' };
  let guard = 0;
  while (round.status === 'playing' && guard < 2000) {
    const cp = round.players[round.currentPlayerIndex];
    const action = chooseAction(round, cp.id, diff[cp.id], r0);
    round = applyAction(round, action);
    guard++;
  }
  return round.winnerId ?? '';
}

describe('ai', () => {
  it('expert beats easy more often than not', () => {
    let expertWins = 0;
    const N = 30;
    for (let i = 0; i < N; i++) {
      if (playGame(1000 + i) === 'expert') expertWins++;
    }
    expect(expertWins / N).toBeGreaterThan(0.4);
  });
});
