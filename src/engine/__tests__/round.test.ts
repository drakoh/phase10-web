import { describe, it, expect } from 'vitest';
import { createRound } from '../rules';

describe('round', () => {
  it('deals 10 cards each and leaves draw pile', () => {
    const players = [
      { id: 'a', name: 'A', avatar: '🙂', isHuman: true, phaseIndex: 0, hand: [] },
      { id: 'b', name: 'B', avatar: '👦', isHuman: false, phaseIndex: 0, hand: [] },
    ];
    const rng = () => 0.5;
    const r = createRound(players as any, 0, rng);
    expect(r.players[0].hand.length).toBe(10);
    expect(r.players[1].hand.length).toBe(10);
    // 108 - 20 dealt - 1 discard = 87
    expect(r.drawPile.length + r.discardPile.length).toBe(88);
  });
});
