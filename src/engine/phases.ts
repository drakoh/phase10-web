/**
 * Phase definitions and validators for Phase 10.
 *
 * A "Phase" is a combination of groups (sets / runs / same-color cards).
 * Each group has a minimum size; players may lay down more than the minimum
 * only if the extra cards fit directly into that group.
 */

import type { Card, Color } from './cards';
import { isNumber, isWild, isSkip } from './cards';

export type GroupKind = 'set' | 'run' | 'color';

export interface PhaseGroup {
  kind: GroupKind;
  cards: string[]; // card ids
  /** set: the number all cards represent */
  setValue?: number;
  /** run: covered numbers (contiguous range) including wild assignments */
  runValues?: number[];
  /** color: the color all cards represent */
  colorValue?: Color;
}

export interface PhaseInstance {
  phaseIndex: number; // 0..9
  groups: PhaseGroup[];
}

export interface PhaseRequirement {
  kind: GroupKind;
  minSize: number;
}

export const PHASES: readonly PhaseRequirement[][] = [
  [{ kind: 'set', minSize: 3 }, { kind: 'set', minSize: 3 }], // 1: 2 sets of 3
  [{ kind: 'set', minSize: 3 }, { kind: 'run', minSize: 4 }], // 2
  [{ kind: 'set', minSize: 4 }, { kind: 'run', minSize: 4 }], // 3
  [{ kind: 'run', minSize: 7 }], // 4
  [{ kind: 'run', minSize: 8 }], // 5
  [{ kind: 'run', minSize: 9 }], // 6
  [{ kind: 'set', minSize: 4 }, { kind: 'set', minSize: 4 }], // 7
  [{ kind: 'color', minSize: 7 }], // 8
  [{ kind: 'set', minSize: 5 }, { kind: 'set', minSize: 2 }], // 9
  [{ kind: 'set', minSize: 5 }, { kind: 'set', minSize: 3 }], // 10
];

export const PHASE_COUNT = PHASES.length;

export function phaseRequirements(phaseIndex: number): PhaseRequirement[] {
  if (phaseIndex < 0 || phaseIndex >= PHASE_COUNT) throw new Error('invalid phase index');
  return PHASES[phaseIndex];
}

// ---------- group validation ----------

function naturals(cards: Card[]): Card[] {
  return cards.filter(isNumber);
}

export function validateSetGroup(cards: Card[], minSize: number): { ok: boolean; value?: number } {
  if (cards.length < minSize) return { ok: false };
  const ns = naturals(cards);
  if (ns.length === 0) return { ok: false }; // need at least one natural
  const value = (ns[0] as { value: number }).value;
  if (!ns.every((c) => (c as { value: number }).value === value)) return { ok: false };
  return { ok: true, value };
}

export function validateColorGroup(cards: Card[], minSize: number): { ok: boolean; color?: Color } {
  if (cards.length < minSize) return { ok: false };
  const ns = naturals(cards);
  if (ns.length === 0) return { ok: false };
  const color = (ns[0] as { color: Color }).color;
  if (!ns.every((c) => (c as { color: Color }).color === color)) return { ok: false };
  return { ok: true, color };
}

export function validateRunGroup(cards: Card[], minSize: number): { ok: boolean; values?: number[] } {
  if (cards.length < minSize) return { ok: false };
  const ns = naturals(cards);
  if (ns.length === 0) return { ok: false };
  // no duplicate natural values
  const vals = ns.map((c) => (c as { value: number }).value);
  if (new Set(vals).size !== vals.length) return { ok: false };
  const minN = Math.min(...vals);
  const maxN = Math.max(...vals);
  const L = cards.length;
  if (maxN - minN + 1 > L) return { ok: false };
  // find a valid starting position s
  const sLow = Math.max(1, maxN - L + 1);
  const sHigh = Math.min(minN, 13 - L);
  if (sLow > sHigh) return { ok: false };
  const s = sLow; // any valid; use lowest
  const runValues: number[] = [];
  for (let i = 0; i < L; i++) runValues.push(s + i);
  // ensure all naturals are covered by runValues
  for (const v of vals) {
    if (!runValues.includes(v)) return { ok: false };
  }
  return { ok: true, values: runValues };
}

// ---------- phase instance validation ----------

export function validatePhaseInstance(phaseIndex: number, instance: PhaseInstance, cardById: Map<string, Card>): { ok: boolean; reason?: string } {
  if (instance.phaseIndex !== phaseIndex) return { ok: false, reason: 'phase mismatch' };
  const reqs = phaseRequirements(phaseIndex);
  const groups = instance.groups;
  if (groups.length !== reqs.length) return { ok: false, reason: 'group count mismatch' };

  // match each requirement to an unused group of same kind with enough size
  const used = new Set<number>();
  const sortedReqs = [...reqs].sort((a, b) => b.minSize - a.minSize);
  for (const req of sortedReqs) {
    let found = -1;
    for (let i = 0; i < groups.length; i++) {
      if (used.has(i)) continue;
      if (groups[i].kind !== req.kind) continue;
      const cards = groups[i].cards.map((id) => cardById.get(id)).filter(Boolean) as Card[];
      if (cards.length !== groups[i].cards.length) return { ok: false, reason: 'unknown card' };
      let res: { ok: boolean };
      if (req.kind === 'set') res = validateSetGroup(cards, req.minSize);
      else if (req.kind === 'run') res = validateRunGroup(cards, req.minSize);
      else res = validateColorGroup(cards, req.minSize);
      if (res.ok) { found = i; break; }
    }
    if (found === -1) return { ok: false, reason: `missing ${req.kind} group size ${req.minSize}` };
    used.add(found);
  }
  return { ok: true };
}

// ---------- find a valid layout in a hand ----------

function combinations<T>(items: T[], k: number): T[][] {
  const result: T[][] = [];
  function rec(start: number, chosen: T[]) {
    if (chosen.length === k) { result.push([...chosen]); return; }
    for (let i = start; i < items.length; i++) {
      chosen.push(items[i]);
      rec(i + 1, chosen);
      chosen.pop();
    }
  }
  rec(0, []);
  return result;
}

export function findPhaseLayout(phaseIndex: number, handCards: Card[]): PhaseInstance | null {
  const reqs = phaseRequirements(phaseIndex);
  const byId = new Map(handCards.map((c) => [c.id, c]));

  // backtracking returning groups
  const foundGroups: PhaseGroup[] = [];
  function backtrack(reqIdx: number, remaining: Card[]): PhaseGroup[] | null {
    if (reqIdx === reqs.length) return [...foundGroups];
    const req = reqs[reqIdx];
    // try subset sizes from minSize up to remaining.length
    for (let k = req.minSize; k <= remaining.length; k++) {
      // but ensure later groups possible: remaining-k >= sum of later minSizes
      const laterMin = reqs.slice(reqIdx + 1).reduce((s, r) => s + r.minSize, 0);
      if (remaining.length - k < laterMin) break;
      const combos = combinations(remaining, k);
      for (const combo of combos) {
        let res: { ok: boolean; value?: number; color?: Color; values?: number[] };
        if (req.kind === 'set') res = validateSetGroup(combo, req.minSize);
        else if (req.kind === 'run') res = validateRunGroup(combo, req.minSize);
        else res = validateColorGroup(combo, req.minSize);
        if (!res.ok) continue;
        const group: PhaseGroup = { kind: req.kind, cards: combo.map((c) => c.id) };
        if (req.kind === 'set') group.setValue = res.value;
        if (req.kind === 'run') group.runValues = res.values;
        if (req.kind === 'color') group.colorValue = res.color;
        foundGroups.push(group);
        const remainingIds = new Set(combo.map((c) => c.id));
        const nextRemaining = remaining.filter((c) => !remainingIds.has(c.id));
        const result = backtrack(reqIdx + 1, nextRemaining);
        if (result) return result;
        foundGroups.pop();
      }
    }
    return null;
  }

  const groups = backtrack(0, handCards);
  if (!groups) return null;
  // validate whole phase (counts etc.) already ensured
  const instance: PhaseInstance = { phaseIndex, groups };
  const v = validatePhaseInstance(phaseIndex, instance, byId);
  if (!v.ok) return null;
  return instance;
}

// ---------- hitting helpers ----------

export function canHitCard(card: Card, group: PhaseGroup): boolean {
  if (isSkip(card)) return false;
  if (group.kind === 'set') {
    if (group.setValue === undefined) return false;
    if (isWild(card)) return true;
    return isNumber(card) && card.value === group.setValue;
  }
  if (group.kind === 'color') {
    if (group.colorValue === undefined) return false;
    if (isWild(card)) return true;
    return isNumber(card) && card.color === group.colorValue;
  }
  // run
  if (!group.runValues || group.runValues.length === 0) return false;
  const min = Math.min(...group.runValues);
  const max = Math.max(...group.runValues);
  if (isWild(card)) {
    return (min - 1 >= 1) || (max + 1 <= 12);
  }
  if (!isNumber(card)) return false;
  const v = card.value;
  if (group.runValues.includes(v)) return false; // duplicate not allowed
  return v === min - 1 || v === max + 1;
}

export function applyHitToGroup(group: PhaseGroup, card: Card): PhaseGroup {
  const newGroup: PhaseGroup = { ...group, cards: [...group.cards, (card as { id: string }).id] };
  if (group.kind === 'set') {
    newGroup.setValue = group.setValue;
  } else if (group.kind === 'color') {
    newGroup.colorValue = group.colorValue;
  } else {
    const min = Math.min(...(group.runValues ?? []));
    const max = Math.max(...(group.runValues ?? []));
    let newValues: number[];
    if (isWild(card)) {
      // extend at low end if possible else high end
      if (min - 1 >= 1) newValues = [min - 1, ...(group.runValues ?? [])];
      else newValues = [...(group.runValues ?? []), max + 1];
    } else {
      const v = (card as { value: number }).value;
      if (v === min - 1) newValues = [v, ...(group.runValues ?? [])];
      else newValues = [...(group.runValues ?? []), v];
    }
    newGroup.runValues = newValues.sort((a, b) => a - b);
  }
  return newGroup;
}

// helper for card lookup
export function cardById(cards: Card[]): Map<string, Card> {
  return new Map(cards.map((c) => [c.id, c]));
}
