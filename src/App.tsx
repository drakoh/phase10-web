import { useState } from 'react';
import { useGameStore } from './state/gameStore';
import { canLayPhase } from './engine/rules';
import './App.css';

const COLOR_CLASS: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400 text-black',
  green: 'bg-green-500',
};

function cardLabel(card: any): string {
  if (card.kind === 'number') return String(card.value);
  if (card.kind === 'wild') return 'W';
  return 'S';
}

function cardColor(card: any): string {
  if (card.kind === 'skip') return 'bg-slate-600';
  return COLOR_CLASS[card.color] ?? 'bg-slate-400';
}

export default function App() {
  const { round, lastScores, gameWinner, startMatch, humanDraw, humanLayPhase, humanDiscard, reset } = useGameStore();
  const [name, setName] = useState('You');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');
  const [aiCount, setAiCount] = useState(1);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (!round) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 gap-4">
        <h1 className="text-3xl font-bold">Phase 10 Web</h1>
        <p className="text-slate-300 text-center max-w-md">
          A mobile-friendly web version of Phase 10. Installable, offline-ready.
        </p>
        <div className="w-full max-w-sm flex flex-col gap-3">
          <input
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <select
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as any)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
          <select
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700"
            value={aiCount}
            onChange={(e) => setAiCount(Number(e.target.value))}
          >
            <option value={1}>1 opponent</option>
            <option value={2}>2 opponents</option>
            <option value={3}>3 opponents</option>
          </select>
          <button
            className="px-4 py-3 rounded bg-blue-600 font-semibold"
            onClick={() => startMatch({ humanName: name, difficulty, aiCount, targetPhases: 10 })}
          >
            Start Game
          </button>
        </div>
        {gameWinner && <p className="text-green-400">Winner: {gameWinner}</p>}
      </div>
    );
  }

  const human = round.players.find((p) => p.id === 'human')!;
  const opponents = round.players.filter((p) => p.id !== 'human');
  const isHumanTurn = round.players[round.currentPlayerIndex].id === 'human' && round.status === 'playing';
  const canLay = isHumanTurn && round.turnStep === 'play' && !round.laid.human && !!canLayPhase(round, 'human');
  const topDiscard = round.discardPile.length ? round.discardPile[round.discardPile.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* opponents */}
      <div className="flex gap-2 p-2 overflow-x-auto">
        {opponents.map((o) => (
          <div key={o.id} className="bg-slate-800 rounded p-2 min-w-[120px]">
            <div className="font-semibold text-sm">{o.name}</div>
            <div className="text-xs text-slate-300">Phase {o.phaseIndex + 1}</div>
            <div className="text-xs text-slate-300">{o.hand.length} cards</div>
            {round.laid[o.id] && <div className="text-xs text-green-400">Laid</div>}
            {round.skipInFront[o.id] && <div className="text-xs text-amber-400">Skipped</div>}
          </div>
        ))}
      </div>

      {/* table */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <div className="flex gap-6">
          <button
            className="w-20 h-28 rounded-lg bg-slate-700 flex items-center justify-center border-2 border-slate-500 disabled:opacity-50"
            disabled={!isHumanTurn || round.turnStep !== 'draw' || round.drawPile.length === 0}
            onClick={() => { humanDraw('draw'); setSelectedCard(null); }}
          >
            <div className="text-center">
              <div className="text-xs">Draw</div>
              <div className="text-lg font-bold">{round.drawPile.length}</div>
            </div>
          </button>
          <button
            className={`w-20 h-28 rounded-lg flex items-center justify-center border-2 ${topDiscard ? cardColor(topDiscard) : 'bg-slate-700 border-slate-500'}`}
            disabled={!isHumanTurn || round.turnStep !== 'draw' || !topDiscard}
            onClick={() => { humanDraw('discard'); setSelectedCard(null); }}
          >
            {topDiscard ? <span className="text-2xl font-bold">{cardLabel(topDiscard)}</span> : <span className="text-xs">Discard</span>}
          </button>
        </div>

        {round.laid.human && (
          <div className="text-sm text-green-400">Your phase is laid. Hits allowed.</div>
        )}

        {lastScores && (
          <div className="bg-slate-800 rounded p-3 text-sm">
            <div className="font-semibold mb-1">Round over</div>
            {Object.entries(lastScores).map(([id, sc]) => (
              <div key={id}>{id}: {sc} pts</div>
            ))}
          </div>
        )}
      </div>

      {/* hand */}
      <div className="p-2 bg-slate-800">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {human.hand.map((card) => (
            <button
              key={card.id}
              className={`w-14 h-20 rounded-md flex items-center justify-center border-2 text-lg font-bold shrink-0 ${cardColor(card)} ${selectedCard === card.id ? 'ring-2 ring-white' : ''}`}
              onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
            >
              {cardLabel(card)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            className="px-3 py-2 rounded bg-indigo-600 text-sm disabled:opacity-50"
            disabled={!canLay}
            onClick={() => { humanLayPhase(); setSelectedCard(null); }}
          >
            Lay Phase
          </button>
          <button
            className="px-3 py-2 rounded bg-amber-600 text-sm disabled:opacity-50"
            disabled={!isHumanTurn || round.turnStep !== 'play' || !selectedCard}
            onClick={() => {
              if (!selectedCard) return;
              const card = human.hand.find((c) => c.id === selectedCard)!;
              if (card.kind === 'skip') {
                // skip first eligible opponent
                const target = round.players.find((p) => p.id !== 'human' && !round.skipInFront[p.id] && round.lastSkipped !== p.id);
                if (target) humanDiscard(selectedCard, target.id);
              } else {
                humanDiscard(selectedCard);
              }
              setSelectedCard(null);
            }}
          >
            Discard Selected
          </button>
          <button
            className="px-3 py-2 rounded bg-slate-600 text-sm"
            onClick={() => { reset(); }}
          >
            Quit
          </button>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Turn: {round.players[round.currentPlayerIndex].name} ({round.turnStep}) {isHumanTurn ? '' : '— waiting for AI'}
        </div>
      </div>
    </div>
  );
}
