import { create } from 'zustand';
import type { RoundState, PlayerState } from '../engine/rules';
import { createRound, applyAction, canLayPhase, scoreRound, advancePhases } from '../engine/rules';
import { chooseAction } from '../engine/ai';
import type { Difficulty } from '../engine/ai';
import { useProgressStore } from './progressStore';
import { playSfx } from '../audio/audio';

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
  actionLog: string[];
  startMatch: (cfg: MatchConfig) => void;
  humanDraw: (source: 'draw' | 'discard') => void;
  humanLayPhase: () => void;
  humanHit: (cardId: string, targetPlayerId: string, groupIndex: number) => void;
  humanDiscard: (cardId: string, skipTargetPlayerId?: string) => void;
  reorderHand: (newHand: any[]) => void;
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
  actionLog: [],

  startMatch: (cfg) => {
    const players: PlayerState[] = [];
    players.push({ id: 'human', name: cfg.humanName || 'You', isHuman: true, phaseIndex: 0, hand: [] });
    for (let i = 0; i < cfg.aiCount; i++) {
      players.push({ id: `ai${i}`, name: `AI ${i + 1}`, isHuman: false, phaseIndex: 0, hand: [] });
    }
    const rng = makeRng();
    const round = createRound(players, 0, rng);
    set({ round, config: cfg, lastScores: null, gameWinner: null, actionLog: [] });
    // if first player is AI, run
    get().runAiTurns();
  },

  humanDraw: (source) => {
    const { round } = get();
    if (!round) return;
    const r = applyAction(round, { type: 'draw', source });
    set({ round: r, actionLog: [...get().actionLog, `You drew from ${source}`].slice(-8) });
    playSfx('draw');
    get().runAiTurns();
  },

  humanLayPhase: () => {
    const { round } = get();
    if (!round) return;
    const layout = canLayPhase(round, 'human');
    if (!layout) return;
    const r = applyAction(round, { type: 'layPhase', groups: layout.groups.map((g) => ({ kind: g.kind, cardIds: [...g.cards] })) });
    set({ round: r, actionLog: [...get().actionLog, 'You laid your phase'].slice(-8) });
    playSfx('lay');
    get().runAiTurns();
  },

  humanHit: (cardId, targetPlayerId, groupIndex) => {
    const { round } = get();
    if (!round) return;
    const r = applyAction(round, { type: 'hit', cardId, targetPlayerId, groupIndex });
    set({ round: r, actionLog: [...get().actionLog, `You hit ${targetPlayerId}`].slice(-8) });
    playSfx('hit');
    get().runAiTurns();
  },

  humanDiscard: (cardId, skipTargetPlayerId) => {
    const { round, config } = get();
    if (!round) return;
    const r = applyAction(round, { type: 'discard', cardId, skipTargetPlayerId });
    const discarded = round.players.find((p) => p.id === 'human')?.hand.find((c) => c.id === cardId);
    playSfx(discarded?.kind === 'skip' ? 'skip' : 'discard');
    set({ round: r, actionLog: [...get().actionLog, `You discarded${discarded?.kind === 'skip' ? ' a Skip' : ''}`].slice(-8) });
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
      const target = config?.targetPhases ?? 10;
      const wonGame = !!r.laid[winner] && (winnerPlayer.phaseIndex + 1) >= target;
      if (wonGame) {
        set({ gameWinner: winner });
        playSfx(winner === 'human' ? 'win' : 'lose');
        if (winner === 'human') {
          const lvl = useProgressStore.getState().currentLevel;
          useProgressStore.getState().completeLevel(lvl, 3);
        }
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

  runAiTurns: async () => {
    const { round, config } = get();
    if (!round || round.status !== 'playing') return;
    const difficulty = config?.difficulty ?? 'easy';
    let current = round;
    const rng = makeRng();
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    let guard = 0;
    while (guard < 50 && current.status === 'playing') {
      const cp = current.players[current.currentPlayerIndex];
      if (cp.isHuman) break;
      // draw
      if (current.turnStep === 'draw') {
        const action = chooseAction(current, cp.id, difficulty, rng);
        current = applyAction(current, action);
        set({ round: current, actionLog: [...get().actionLog, `${cp.name} drew`].slice(-8) });
        await delay(400);
      }
      // play (lay/hits) until discard
      let playGuard = 0;
      while (playGuard < 20 && current.status === 'playing' && current.turnStep === 'play') {
        const cp2 = current.players[current.currentPlayerIndex];
        if (cp2.isHuman) break;
        const action = chooseAction(current, cp2.id, difficulty, rng);
        current = applyAction(current, action);
        const msg = action.type === 'layPhase' ? `${cp2.name} laid a phase` :
          action.type === 'hit' ? `${cp2.name} hit` :
          action.type === 'discard' ? `${cp2.name} discarded` : `${cp2.name} played`;
        set({ round: current, actionLog: [...get().actionLog, msg].slice(-8) });
        await delay(action.type === 'layPhase' ? 700 : action.type === 'hit' ? 300 : 400);
        playGuard++;
        if (action.type === 'discard') break;
      }
      guard++;
    }
    set({ round: current });
  },

  reorderHand: (newHand) => {
    const { round } = get();
    if (!round) return;
    const players = round.players.map((p) => (p.id === 'human' ? { ...p, hand: newHand } : p));
    set({ round: { ...round, players } });
  },
  reset: () => set({ round: null, config: null, lastScores: null, gameWinner: null, actionLog: [] }),
}));
