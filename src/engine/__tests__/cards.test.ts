import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, cardPoints } from '../cards';

describe('deck', () => {
  it('has 108 cards', () => {
    expect(createDeck().length).toBe(108);
  });

  it('shuffles deterministically with rng', () => {
    const deck = createDeck();
    let i = 0;
    const rng = () => (i++ % 100) / 100;
    const a = shuffle(deck, rng);
    i = 0;
    const b = shuffle(deck, rng);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('scores cards', () => {
    expect(cardPoints({ kind: 'number', value: 5, color: 'red', id: 'x' })).toBe(5);
    expect(cardPoints({ kind: 'number', value: 12, color: 'red', id: 'x' })).toBe(10);
    expect(cardPoints({ kind: 'skip', id: 'x' })).toBe(15);
    expect(cardPoints({ kind: 'wild', color: 'red', id: 'x' })).toBe(25);
  });
});
