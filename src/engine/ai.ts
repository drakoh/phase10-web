/**
 * AI opponents for Phase 10.
 *
 * A single strategy parameterized by difficulty. Deterministic given an RNG.
 */

import type { Card, Color } from './cards';
import { isWild, isSkip, cardPoints } from './cards';
import type { RoundState, Action, PlayerState } from './rules';
import { legalActions, canLayPhase } from './rules';
import { findPhaseLayout } from './phases';
import type { GroupKind } from './phases';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface AiProfile {
  difficulty: Difficulty;
  name: string;
}

function rand(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

function mistakeRate(d: Difficulty): number {
  return d === 'easy' ? 0.25 : d === 'medium' ? 0.08 : 0;
}

/** Is this card useful to keep for the current phase / hitting? */
function isUseful(card: Card, player: PlayerState, state: RoundState): boolean {
  if (isWild(card)) return true;
  if (isSkip(card)) return true; // keep skips as weapons
  if (!isNumberCard(card)) return false;

  const laidSelf = state.laid[player.id];
  // hitting usefulness
  if (laidSelf) {
    for (const t of state.players) {
      const tl = state.laid[t.id];
      if (!tl) continue;
      for (const g of tl.groups) {
        // can this card hit group?
        if (g.kind === 'set' && g.setValue === card.value) return true;
        if (g.kind === 'color' && g.colorValue === card.color) return true;
        if (g.kind === 'run' && g.runValues) {
          const min = Math.min(...g.runValues);
          const max = Math.max(...g.runValues);
          if (card.value === min - 1 || card.value === max + 1) return true;
        }
      }
    }
  }

  // phase usefulness: would adding this card allow a layout?
  if (!laidSelf) {
    const withCard = findPhaseLayout(player.phaseIndex, [...player.hand]);
    // if card is part of some valid layout of current hand, useful
    // Check by removing: if hand without card cannot form phase but hand with can
    const without = player.hand.filter((c) => c.id !== card.id);
    const canWith = findPhaseLayout(player.phaseIndex, player.hand) !== null;
    const canWithout = findPhaseLayout(player.phaseIndex, without) !== null;
    if (canWith && !canWithout) return true;
    // also if card value matches a needed set/run loosely
    void withCard;
  }
  return false;
}

function isNumberCard(card: Card): card is { kind: 'number'; value: number; color: Color; id: string } {
  return card.kind === 'number';
}

function chooseSkipTarget(state: RoundState, playerId: string, difficulty: Difficulty, rng: () => number): string | undefined {
  const opponents = state.players.filter((p) => p.id !== playerId);
  const eligible = opponents.filter((p) => !state.skipInFront[p.id] && state.lastSkipped !== p.id);
  if (eligible.length === 0) return undefined;
  if (difficulty === 'easy') {
    return eligible[rand(rng, eligible.length)].id;
  }
  // target leader: highest phaseIndex, then smallest hand
  const sorted = [...eligible].sort((a, b) => {
    if (b.phaseIndex !== a.phaseIndex) return b.phaseIndex - a.phaseIndex;
    return a.hand.length - b.hand.length;
  });
  return sorted[0].id;
}

export function chooseAction(state: RoundState, playerId: string, difficulty: Difficulty, rng: () => number): Action {
  const player = state.players.find((p) => p.id === playerId)!;
  const las = legalActions(state, playerId);
  if (las.length === 0) throw new Error('no legal actions');

  // --- draw step ---
  if (state.turnStep === 'draw') {
    const drawOpts = las.filter((a) => a.type === 'draw');
    const drawPileOpt = drawOpts.find((a) => a.type === 'draw' && a.source === 'draw');
    const discardOpt = drawOpts.find((a) => a.type === 'draw' && a.source === 'discard');

    if (!discardOpt || !drawPileOpt) return drawOpts[0];

    const top = state.discardPile[state.discardPile.length - 1];
    // decide usefulness of top discard
    let wantDiscard = false;
    if (top && top.kind !== 'skip') {
      // useful if helps phase or hitting
      if (isWild(top)) wantDiscard = difficulty !== 'easy' || rng() < 0.5;
      else if (isNumberCard(top)) {
        // phase usefulness
        const without = player.hand;
        const withTop = [...player.hand, top];
        const canWithout = findPhaseLayout(player.phaseIndex, without) !== null;
        const canWith = findPhaseLayout(player.phaseIndex, withTop) !== null;
        if (canWith && !canWithout) wantDiscard = true;
        // hitting usefulness
        if (!wantDiscard) {
          const laidSelf = state.laid[player.id];
          if (laidSelf) {
            for (const t of state.players) {
              const tl = state.laid[t.id];
              if (!tl) continue;
              for (const g of tl.groups) {
                if (g.kind === 'set' && g.setValue === (top as any).value) wantDiscard = true;
                if (g.kind === 'color' && g.colorValue === (top as any).color) wantDiscard = true;
                if (g.kind === 'run' && g.runValues) {
                  const min = Math.min(...g.runValues);
                  const max = Math.max(...g.runValues);
                  if ((top as any).value === min - 1 || (top as any).value === max + 1) wantDiscard = true;
                }
              }
            }
          }
        }
      }
    }

    // mistake: sometimes ignore usefulness
    if (rng() < mistakeRate(difficulty)) wantDiscard = !wantDiscard;

    if (wantDiscard && discardOpt) return discardOpt;
    return drawPileOpt;
  }

  // --- play step ---
  // 1. lay phase if possible and not laid
  if (!state.laid[player.id]) {
    const layout = canLayPhase(state, playerId);
    if (layout) {
      // construct action groups from layout
      const groups = layout.groups.map((g) => ({ kind: g.kind as GroupKind, cardIds: [...g.cards] }));
      return { type: 'layPhase', groups };
    }
  }

  // 2. hits: do a hit if possible (greedy), with selectivity by difficulty
  const hitOpts = las.filter((a) => a.type === 'hit');
  if (hitOpts.length > 0) {
    // expert: prefer hits that empty hand or are on own phase; else first
    if (difficulty === 'expert' || difficulty === 'hard') {
      // prefer hitting own phase first
      const ownHits = hitOpts.filter((a) => a.type === 'hit' && a.targetPlayerId === playerId);
      const pool = ownHits.length > 0 ? ownHits : hitOpts;
      return pool[0];
    }
    if (difficulty === 'easy') {
      // only hit sometimes
      if (rng() < 0.6) return hitOpts[rand(rng, hitOpts.length)];
    } else {
      return hitOpts[0];
    }
  }

  // 3. discard
  const discardOpts = las.filter((a) => a.type === 'discard');
  if (discardOpts.length === 0) throw new Error('no discard options');

  // skip play: if has skip card, play it strategically (only if a threat exists)
  const skipOpts = discardOpts.filter((a) => a.type === 'discard' && a.skipTargetPlayerId);
  if (skipOpts.length > 0) {
    // decide whether to use skip
    const useSkip = difficulty === 'easy' ? rng() < 0.4 : true;
    // only if an opponent is ahead
    const leader = [...state.players].filter((p) => p.id !== playerId).sort((a, b) => {
      if (b.phaseIndex !== a.phaseIndex) return b.phaseIndex - a.phaseIndex;
      return a.hand.length - b.hand.length;
    })[0];
    const threat = leader && (leader.phaseIndex > player.phaseIndex || leader.hand.length <= 3);
    if (useSkip && threat) {
      const target = chooseSkipTarget(state, playerId, difficulty, rng);
      const opt = skipOpts.find((a) => a.type === 'discard' && a.skipTargetPlayerId === target);
      if (opt) return opt;
      return skipOpts[0];
    }
  }

  // normal discard: choose least useful card
  const normalOpts = discardOpts.filter((a) => a.type === 'discard' && !a.skipTargetPlayerId);
  const pool = normalOpts.length > 0 ? normalOpts : discardOpts;

  // score each candidate
  const scored = pool.map((a) => {
    const card = player.hand.find((c) => c.id === a.cardId)!;
    const useful = isUseful(card, player, state);
    // lower score = discard first
    let priority = cardPoints(card);
    if (useful) priority += 1000; // keep useful cards
    if (isSkip(card)) priority += 500; // keep skips
    if (isWild(card)) priority += 2000; // keep wilds
    // mistake: shuffle priority
    if (rng() < mistakeRate(difficulty)) priority = Math.random() * 1000;
    return { action: a, priority };
  });
  scored.sort((a, b) => a.priority - b.priority);
  return scored[0].action;
}
