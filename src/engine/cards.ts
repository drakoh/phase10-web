/**
 * Card model, deck construction and shuffling for Phase 10.
 *
 * The engine is intentionally pure: no React, no DOM, no browser APIs.
 * All randomness is injected via a PRNG so matches are reproducible.
 */

export type Color = 'red' | 'blue' | 'yellow' | 'green';

export type Card =
  | { kind: 'number'; value: number; color: Color; id: string }
  | { kind: 'wild'; color: Color; id: string }
  | { kind: 'skip'; id: string };

export const COLORS: readonly Color[] = ['red', 'blue', 'yellow', 'green'] as const;
export const MIN_VALUE = 1;
export const MAX_VALUE = 12;

/** Points scored for a card left in hand at end of round. */
export function cardPoints(card: Card): number {
  switch (card.kind) {
    case 'number':
      return card.value <= 9 ? 5 : 10;
    case 'skip':
      return 15;
    case 'wild':
      return 25;
  }
}

export function isWild(card: Card): card is { kind: 'wild'; color: Color; id: string } {
  return card.kind === 'wild';
}

export function isSkip(card: Card): card is { kind: 'skip'; id: string } {
  return card.kind === 'skip';
}

export function isNumber(card: Card): card is { kind: 'number'; value: number; color: Color; id: string } {
  return card.kind === 'number';
}

/**
 * Build a fresh 108-card deck. Card ids are deterministic given the seed prefix
 * so that shuffling alone controls randomness.
 */
export function createDeck(idPrefix = 'c'): Card[] {
  const cards: Card[] = [];
  let n = 0;
  const nextId = () => `${idPrefix}${n++}`;

  // 2 sets of 1..12 per color (96 cards)
  for (let set = 0; set < 2; set++) {
    for (const color of COLORS) {
      for (let v = MIN_VALUE; v <= MAX_VALUE; v++) {
        cards.push({ kind: 'number', value: v, color, id: nextId() });
      }
    }
  }
  // 8 wilds, 2 per color
  for (const color of COLORS) {
    for (let i = 0; i < 2; i++) {
      cards.push({ kind: 'wild', color, id: nextId() });
    }
  }
  // 4 blue skips
  for (let i = 0; i < 4; i++) {
    cards.push({ kind: 'skip', id: nextId() });
  }

  if (cards.length !== 108) {
    throw new Error(`Deck size ${cards.length}, expected 108`);
  }
  return cards;
}

/** Fisher-Yates shuffle using injected RNG returning [0,1). */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Draw `count` cards from the top of a pile, returning [drawn, remaining]. */
export function drawCards(pile: readonly Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  if (count < 0) throw new Error('count must be >= 0');
  if (count > pile.length) throw new Error('not enough cards to draw');
  return { drawn: pile.slice(0, count), remaining: pile.slice(count) };
}
