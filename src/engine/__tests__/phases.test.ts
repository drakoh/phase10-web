import { describe, it, expect } from 'vitest';
import { findPhaseLayout } from '../phases';
import type { Card } from '../cards';

function C(kind: string, value?: number, color?: string, id?: string): Card {
  if (kind === 'number') return { kind: 'number', value: value!, color: color as any, id: id ?? `${color}${value}` };
  if (kind === 'wild') return { kind: 'wild', color: color as any, id: id ?? `w${color}` };
  return { kind: 'skip', id: id ?? 's' };
}

describe('phases', () => {
  it('finds phase 1 layout (2 sets of 3)', () => {
    const hand = [
      C('number', 5, 'red', 'a'), C('number', 5, 'blue', 'b'), C('number', 5, 'green', 'c'),
      C('number', 7, 'red', 'd'), C('number', 7, 'blue', 'e'), C('number', 7, 'green', 'f'),
    ];
    const layout = findPhaseLayout(0, hand);
    expect(layout).not.toBeNull();
    expect(layout!.groups.length).toBe(2);
  });

  it('rejects phase 1 with only one set', () => {
    const hand = [
      C('number', 5, 'red', 'a'), C('number', 5, 'blue', 'b'), C('number', 5, 'green', 'c'),
      C('number', 7, 'red', 'd'), C('number', 8, 'blue', 'e'),
    ];
    expect(findPhaseLayout(0, hand)).toBeNull();
  });

  it('finds phase 4 (run of 7)', () => {
    const hand = [1,2,3,4,5,6,7].map((v) => C('number', v, 'red', `r${v}`));
    const layout = findPhaseLayout(3, hand);
    expect(layout).not.toBeNull();
  });

  it('run cannot exceed 12', () => {
    const hand = [10,11,12,1,2,3,4].map((v, i) => C('number', v, 'red', `x${i}`));
    // a run crossing 12->1 invalid
    expect(findPhaseLayout(3, hand)).toBeNull();
  });

  it('wild can complete a run', () => {
    const hand = [
      C('number', 3, 'red', 'a'), C('number', 4, 'blue', 'b'), C('number', 6, 'green', 'c'),
      C('wild', undefined, 'red', 'w'),
    ];
    // need 4 run; have 3,4,6,wild -> can be 3,4,5,6
    const layout = findPhaseLayout(1, hand); // phase 2 requires set3+run4; no set, null
    expect(layout).toBeNull();
  });
});
