import { describe, it, expect } from 'vitest';
import { createRound } from '../rules';
import { canLayPhase } from '../rules';

describe('sim', () => {
  it('logs ai first-turn lay rate', () => {
    let lays = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const players = [
        { id: 'human', name: 'H', avatar: '🙂', isHuman: true, phaseIndex: 0, hand: [] },
        { id: 'ai', name: 'A', avatar: '👦', isHuman: false, phaseIndex: 0, hand: [] },
      ];
      let s = 12345 + i;
      const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
      const r = createRound(players as any, 0, rng);
      // simulate ai first turn draw
      const aiIdx = r.players.findIndex((p) => p.id === 'ai');
      // ai might be first or second depending on dealer; ensure ai turn
      // just check if ai can lay after drawing one card from draw pile
      const aiPlayer = r.players[aiIdx];
      // draw one
      const drawn = r.drawPile[0];
      const hand = [...aiPlayer.hand, drawn];
      if (canLayPhase({ ...r, players: r.players.map((p) => p.id === 'ai' ? { ...p, hand } : p), turnStep: 'play' } as any, 'ai')) {
        lays++;
      }
    }
    console.log('AI can lay phase after 1 draw:', lays, '/', N, '=', (lays/N*100).toFixed(1)+'%');
    expect(true).toBe(true);
  });
});
