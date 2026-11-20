import { create } from 'zustand';
import type { RoundState, PlayerState } from '../engine/rules';
import { createRound, applyAction, canLayPhase, scoreRound, advancePhases } from '../engine/rules';
import { chooseAction } from '../engine/ai';
import type { Difficulty } from '../engine/ai';

interface MatchConfig {
  humanName: string;
  aiCount: number;
  difficulty: Difficulty;
  targetPhases: number;
}

interface GameStore {
  round: RoundState | null;
  config: MatchConfig | null;
  lastScores: Record<string, number> | null;
  gameWinner: string | null;
  startMatch: (cfg: MatchConfig) => void;
  humanDraw: (source: 'draw' | 'discard') => void;
  humanLayPhase: () => void;
  humanHit: (cardId: string, targetPlayerId: string, groupIndex: number) => void;
  humanDiscard: (cardId: string, skipTargetPlayerId?: string) => void;
  runAiTurns: () => void;
  reset: () => void;
}

function makeRng(seed = Date.now()): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  round: null,
  config: null,
  lastScores: null,
  gameWinner: null,

  startMatch: (cfg) => {
    const players: PlayerState[] = [];
    players.push({ id: 'human', name: cfg.humanName || 'You', isHuman: true, phaseIndex: 0, hand: [] });
    for (let i = 0; i < cfg.aiCount; i++) {
      players.push({ id: `ai${i}`, name: `AI ${i + 1}`, isHuman: false, phaseIndex: 0, hand: [] });
    }
    const rng = makeRng();
    const round = createRound(players, 0, rng);
    set({ round, config: cfg, lastScores: null, gameWinner: null });
    // if first player is AI, run
    get().runAiTurns();
  },

  humanDraw: (source) => {
    const { round } = get();
    if (!round) return;
    const r = applyAction(round, { type: 'draw', source });
    set({ round: r });
    get().runAiTurns();
  },

  humanLayPhase: () => {
    const { round } = get();
    if (!round) return;
    const layout = canLayPhase(round, 'human');
    if (!layout) return;
    const r = applyAction(round, { type: 'layPhase', groups: layout.groups.map((g) => ({ kind: g.kind, cardIds: [...g.cards] })) });
    set({ round: r });
    get().runAiTurns();
  },

  humanHit: (cardId, targetPlayerId, groupIndex) => {
    const { round } = get();
    if (!round) return;
    const r = applyAction(round, { type: 'hit', cardId, targetPlayerId, groupIndex });
    set({ round: r });
    get().runAiTurns();
  },

  humanDiscard: (cardId, skipTargetPlayerId) => {
    const { round, config } = get();
    if (!round) return;
    const r = applyAction(round, { type: 'discard', cardId, skipTargetPlayerId });
    // check round over
    if (r.status === 'finished') {
      const scores = scoreRound(r);
      set({ round: r, lastScores: scores });
      // advance phases
      const advanced = advancePhases(r);
      // check game win: winner completed phase 10
      const winner = r.winnerId!;
      const winnerPlayer = r.players.find((p) => p.id === winner)!;
      // phaseIndex before round: if was 9 and laid -> game win
      const wonGame = winnerPlayer.phaseIndex === 9 && r.laid[winner] !== null; // phaseIndex already? advance not applied to r; r.players phaseIndex unchanged
      // Actually phaseIndex in r.players is phase at start of round. winner with phaseIndex 9 laid phase 10 => game win.
      if (wonGame || (config && /* target phases */ false)) {
        set({ gameWinner: winner });
      }
      // prepare next round if no game winner
      if (!wonGame) {
        const rng = makeRng();
        const nextRound = createRound(advanced, (r.dealerIndex + 1) % r.players.length, rng);
        set({ round: nextRound });
        get().runAiTurns();
      }
      return;
    }
    set({ round: r });
    get().runAiTurns();
  },

  runAiTurns: () => {
    const { round, config } = get();
    if (!round || round.status !== 'playing') return;
    const difficulty = config?.difficulty ?? 'easy';
    let current = round;
    const rng = makeRng();
    // loop while current player is AI
    let guard = 0;
    while (guard < 50 && current.status === 'playing') {
      const cp = current.players[current.currentPlayerIndex];
      if (cp.isHuman) break;
      // run one full turn for AI
      // draw
      if (current.turnStep === 'draw') {
        const action = chooseAction(current, cp.id, difficulty, rng);
        current = applyAction(current, action);
      }
      // play (lay/hits) until discard
      let playGuard = 0;
      while (playGuard < 20 && current.status === 'playing' && current.turnStep === 'play') {
        const cp2 = current.players[current.currentPlayerIndex];
        if (cp2.isHuman) break;
        const action = chooseAction(current, cp2.id, difficulty, rng);
        current = applyAction(current, action);
        playGuard++;
        if (action.type === 'discard') break;
      }
      guard++;
    }
    set({ round: current });
  },

  reset: () => set({ round: null, config: null, lastScores: null, gameWinner: null }),
}));
