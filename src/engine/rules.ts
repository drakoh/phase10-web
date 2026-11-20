/**
 * Round-level rules engine for Phase 10.
 *
 * Pure, immutable, deterministic given an injected RNG. All state transitions
 * go through applyAction; illegal moves throw IllegalMoveError.
 */

import type { Card, Color } from './cards';
import { createDeck, shuffle, cardPoints } from './cards';
import type { PhaseGroup, PhaseInstance } from './phases';
import {
  validatePhaseInstance,
  findPhaseLayout,
  canHitCard,
  applyHitToGroup,
  validateRunGroup,
} from './phases';
import type { GroupKind } from './phases';

export class IllegalMoveError extends Error {}

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  phaseIndex: number; // 0..9, phase currently being attempted
  hand: Card[];
}

export type TurnStep = 'draw' | 'play';

export interface RoundState {
  players: PlayerState[];
  drawPile: Card[];
  discardPile: Card[];
  skipInFront: Record<string, Card | null>;
  laid: Record<string, PhaseInstance | null>;
  currentPlayerIndex: number;
  dealerIndex: number;
  status: 'playing' | 'finished';
  winnerId?: string;
  turnStep: TurnStep;
  lastSkipped: string | null;
}

export type Action =
  | { type: 'draw'; source: 'draw' | 'discard' }
  | { type: 'layPhase'; groups: { kind: GroupKind; cardIds: string[] }[] }
  | { type: 'hit'; cardId: string; targetPlayerId: string; groupIndex: number }
  | { type: 'discard'; cardId: string; skipTargetPlayerId?: string };

// ---------- helpers ----------

function replacePlayer(players: PlayerState[], id: string, patch: Partial<PlayerState>): PlayerState[] {
  return players.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

function cardByIdMap(cards: Card[]): Map<string, Card> {
  return new Map(cards.map((c) => [c.id, c]));
}

function resolvePendingSkip(state: RoundState): RoundState {
  let s = state;
  let guard = 0;
  while (guard < s.players.length + 2) {
    const p = s.players[s.currentPlayerIndex];
    const skip = s.skipInFront[p.id];
    if (!skip) break;
    const newSkip = { ...s.skipInFront, [p.id]: null };
    s = {
      ...s,
      skipInFront: newSkip,
      discardPile: [...s.discardPile, skip],
      currentPlayerIndex: (s.currentPlayerIndex + 1) % s.players.length,
      turnStep: 'draw',
      // if this player was lastSkipped, they still haven't played normally;
      // keep lastSkipped set (they were skipped, not a normal turn)
    };
    guard++;
  }
  return s;
}

function finishIfGoOut(state: RoundState, playerId: string): RoundState {
  const p = state.players.find((x) => x.id === playerId)!;
  if (state.status === 'finished') return state;
  if (!state.laid[playerId]) return state;
  if (p.hand.length !== 0) return state;
  return { ...state, status: 'finished', winnerId: playerId };
}

// ---------- create round ----------

export function createRound(players: PlayerState[], dealerIndex: number, rng: () => number): RoundState {
  if (players.length < 2 || players.length > 6) throw new Error('player count 2..6');
  const deck = shuffle(createDeck(), rng);
  const n = players.length;
  const hands: Card[][] = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    hands.push(deck.slice(cursor, cursor + 10));
    cursor += 10;
  }
  const rest = deck.slice(cursor);
  const newPlayers = players.map((p, i) => ({ ...p, hand: hands[i] }));

  const skipInFront: Record<string, Card | null> = {};
  for (const p of newPlayers) skipInFront[p.id] = null;
  let discardPile: Card[] = [];
  let drawPile = rest;
  // turn top of draw pile
  if (drawPile.length > 0) {
    const top = drawPile[0];
    drawPile = drawPile.slice(1);
    if (top.kind === 'skip') {
      // first player (left of dealer) auto-skipped
      const firstIdx = (dealerIndex + 1) % n;
      skipInFront[newPlayers[firstIdx].id] = top;
    } else {
      discardPile = [top];
    }
  }

  const laid: Record<string, PhaseInstance | null> = {};
  for (const p of newPlayers) laid[p.id] = null;

  const state: RoundState = {
    players: newPlayers,
    drawPile,
    discardPile,
    skipInFront,
    laid,
    currentPlayerIndex: (dealerIndex + 1) % n,
    dealerIndex,
    status: 'playing',
    turnStep: 'draw',
    lastSkipped: null,
  };
  return resolvePendingSkip(state);
}

// ---------- legal actions ----------

export function legalActions(state: RoundState, playerId: string): Action[] {
  if (state.status !== 'playing') return [];
  const ci = state.currentPlayerIndex;
  if (state.players[ci].id !== playerId) return [];
  const actions: Action[] = [];

  if (state.turnStep === 'draw') {
    if (state.drawPile.length > 0) actions.push({ type: 'draw', source: 'draw' });
    if (state.discardPile.length > 0) {
      const top = state.discardPile[state.discardPile.length - 1];
      if (top.kind !== 'skip') actions.push({ type: 'draw', source: 'discard' });
    }
    return actions;
  }

  const player = state.players[ci];
  const laidSelf = state.laid[player.id];

  // hits
  if (laidSelf) {
    for (const card of player.hand) {
      for (const target of state.players) {
        const tLaid = state.laid[target.id];
        if (!tLaid) continue;
        tLaid.groups.forEach((g, gi) => {
          if (canHitCard(card, g)) {
            actions.push({ type: 'hit', cardId: card.id, targetPlayerId: target.id, groupIndex: gi });
          }
        });
      }
    }
  }

  // discards
  for (const card of player.hand) {
    if (card.kind === 'skip') {
      for (const target of state.players) {
        if (target.id === player.id) continue;
        if (state.skipInFront[target.id]) continue; // already skipped
        if (state.lastSkipped === target.id) continue; // can't skip same twice in a row
        actions.push({ type: 'discard', cardId: card.id, skipTargetPlayerId: target.id });
      }
    } else {
      actions.push({ type: 'discard', cardId: card.id });
    }
  }
  return actions;
}

export function canLayPhase(state: RoundState, playerId: string): PhaseInstance | null {
  if (state.status !== 'playing') return null;
  const ci = state.currentPlayerIndex;
  if (state.players[ci].id !== playerId) return null;
  if (state.turnStep !== 'play') return null;
  if (state.laid[playerId]) return null;
  const player = state.players[ci];
  return findPhaseLayout(player.phaseIndex, player.hand);
}

// ---------- apply action ----------

export function applyAction(state: RoundState, action: Action): RoundState {
  if (state.status !== 'playing') throw new IllegalMoveError('round finished');
  const ci = state.currentPlayerIndex;
  const player = state.players[ci];

  if (action.type === 'draw') {
    if (state.turnStep !== 'draw') throw new IllegalMoveError('not draw step');
    if (action.source === 'draw') {
      if (state.drawPile.length === 0) throw new IllegalMoveError('empty draw pile');
      const card = state.drawPile[0];
      const newPlayers = replacePlayer(state.players, player.id, { hand: [...player.hand, card] });
      return { ...state, drawPile: state.drawPile.slice(1), players: newPlayers, turnStep: 'play' };
    } else {
      if (state.discardPile.length === 0) throw new IllegalMoveError('empty discard pile');
      const top = state.discardPile[state.discardPile.length - 1];
      if (top.kind === 'skip') throw new IllegalMoveError('cannot pick up skip');
      const newPlayers = replacePlayer(state.players, player.id, { hand: [...player.hand, top] });
      return { ...state, discardPile: state.discardPile.slice(0, -1), players: newPlayers, turnStep: 'play' };
    }
  }

  if (action.type === 'layPhase') {
    if (state.turnStep !== 'play') throw new IllegalMoveError('not play step');
    if (state.laid[player.id]) throw new IllegalMoveError('phase already laid');
    const byId = cardByIdMap(player.hand);
    // validate card ids belong to hand, no duplicates
    const allIds: string[] = [];
    for (const g of action.groups) for (const id of g.cardIds) allIds.push(id);
    if (new Set(allIds).size !== allIds.length) throw new IllegalMoveError('duplicate card in phase');
    for (const id of allIds) if (!byId.has(id)) throw new IllegalMoveError('card not in hand');

    const groups = action.groups.map((g) => {
      const cs = g.cardIds.map((id) => byId.get(id)!);
      const grp: PhaseGroup = { kind: g.kind, cards: [...g.cardIds], cardObjs: [...cs] };
      if (g.kind === 'set') {
        const ns = cs.filter((c) => c.kind === 'number');
        grp.setValue = ns.length ? (ns[0] as { value: number }).value : undefined;
      } else if (g.kind === 'run') {
        const res = validateRunGroup(cs, 0);
        grp.runValues = res.values;
      } else {
        const ns = cs.filter((c) => c.kind === 'number');
        grp.colorValue = ns.length ? (ns[0] as { color: Color }).color : undefined;
      }
      return grp;
    });
    const instance2: PhaseInstance = { phaseIndex: player.phaseIndex, groups };
    const v2 = validatePhaseInstance(player.phaseIndex, instance2, byId);
    if (!v2.ok) throw new IllegalMoveError(v2.reason ?? 'invalid phase');

    const laidCards = new Set(allIds);
    const newHand = player.hand.filter((c) => !laidCards.has(c.id));
    const newLaid = { ...state.laid, [player.id]: instance2 };
    const newPlayers = replacePlayer(state.players, player.id, { hand: newHand });
    return { ...state, players: newPlayers, laid: newLaid };
  }

  if (action.type === 'hit') {
    if (state.turnStep !== 'play') throw new IllegalMoveError('not play step');
    if (!state.laid[player.id]) throw new IllegalMoveError('must lay own phase first');
    const card = player.hand.find((c) => c.id === action.cardId);
    if (!card) throw new IllegalMoveError('card not in hand');
    const targetLaid = state.laid[action.targetPlayerId];
    if (!targetLaid) throw new IllegalMoveError('target has no laid phase');
    const group = targetLaid.groups[action.groupIndex];
    if (!group) throw new IllegalMoveError('invalid group index');
    if (!canHitCard(card, group)) throw new IllegalMoveError('card does not fit');

    const newGroup = applyHitToGroup(group, card);
    const newGroups = targetLaid.groups.map((g, i) => (i === action.groupIndex ? newGroup : g));
    const newTargetLaid: PhaseInstance = { ...targetLaid, groups: newGroups };
    const newLaid = { ...state.laid, [action.targetPlayerId]: newTargetLaid };
    const newHand = player.hand.filter((c) => c.id !== card.id);
    const newPlayers = replacePlayer(state.players, player.id, { hand: newHand });
    let newState: RoundState = { ...state, players: newPlayers, laid: newLaid };
    newState = finishIfGoOut(newState, player.id);
    return newState;
  }

  if (action.type === 'discard') {
    if (state.turnStep !== 'play') throw new IllegalMoveError('not play step');
    const card = player.hand.find((c) => c.id === action.cardId);
    if (!card) throw new IllegalMoveError('card not in hand');

    const isSkipCard = card.kind === 'skip';
    let newSkipInFront = { ...state.skipInFront };
    let newDiscard = state.discardPile;
    let newLastSkipped = state.lastSkipped;

    if (isSkipCard) {
      const targetId = action.skipTargetPlayerId;
      if (!targetId) throw new IllegalMoveError('skip requires target');
      if (targetId === player.id) throw new IllegalMoveError('cannot skip self');
      if (newSkipInFront[targetId]) throw new IllegalMoveError('target already skipped');
      if (state.lastSkipped === targetId) throw new IllegalMoveError('cannot skip same player twice in a row');
      newSkipInFront[targetId] = card;
      newLastSkipped = targetId;
    } else {
      newDiscard = [...state.discardPile, card];
    }

    const newHand = player.hand.filter((c) => c.id !== card.id);
    const newPlayers = replacePlayer(state.players, player.id, { hand: newHand });

    // if this player was the lastSkipped, they have now played normally
    let lastSkipped = newLastSkipped;
    if (state.lastSkipped === player.id) lastSkipped = null;

    // check go out before advancing
    let newState: RoundState = {
      ...state,
      players: newPlayers,
      discardPile: newDiscard,
      skipInFront: newSkipInFront,
      turnStep: 'draw',
      currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      lastSkipped: lastSkipped,
    };
    // go out check
    const laidSelf = state.laid[player.id];
    if (laidSelf && newHand.length === 0) {
      newState = { ...newState, status: 'finished', winnerId: player.id };
    }
    if (newState.status !== 'finished') {
      newState = resolvePendingSkip(newState);
    }
    return newState;
  }

  throw new IllegalMoveError('unknown action');
}

// ---------- scoring / advancement ----------

export function scoreRound(state: RoundState): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const p of state.players) {
    if (p.id === state.winnerId) {
      scores[p.id] = 0;
    } else {
      let pts = 0;
      for (const c of p.hand) pts += cardPoints(c);
      scores[p.id] = pts;
    }
  }
  return scores;
}

export function advancePhases(state: RoundState): PlayerState[] {
  return state.players.map((p) => {
    if (state.laid[p.id]) {
      return { ...p, phaseIndex: Math.min(9, p.phaseIndex + 1) };
    }
    return { ...p };
  });
}

export function isRoundOver(state: RoundState): boolean {
  return state.status === 'finished';
}

// re-export for convenience
export { PHASES, phaseRequirements, canHitCard } from './phases';
export type { PhaseGroup, PhaseInstance } from './phases';
export type { Color } from './cards';
