import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from './state/gameStore';
import { canLayPhase, canHitCard } from './engine/rules';
import CardView, { CardBack } from './components/Card';
import './App.css';

export default function App() {
  const { t, i18n } = useTranslation();
  const { round, lastScores, gameWinner, startMatch, humanDraw, humanLayPhase, humanHit, humanDiscard, reset } = useGameStore();
  const [name, setName] = useState('You');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');
  const [aiCount, setAiCount] = useState(1);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (gameWinner) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 gap-4 relative">
        <h1 className="text-3xl font-bold">{t('app.title')}</h1>
        <p className="text-green-400 text-xl">Winner: {gameWinner}</p>
        <button className="px-4 py-3 rounded bg-blue-600 font-semibold" onClick={() => reset()}>
          {t('home.start')}
        </button>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 gap-4 relative">
        <div className="absolute top-4 right-4">
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs"
            onClick={() => {
              const next = i18n.language === 'fr' ? 'en' : 'fr';
              i18n.changeLanguage(next);
              localStorage.setItem('lang', next);
            }}
          >
            {i18n.language === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>
        <h1 className="text-3xl font-bold">{t('app.title')}</h1>
        <p className="text-slate-300 text-center max-w-md">{t('app.tagline')}</p>
        <div className="w-full max-w-sm flex flex-col gap-3">
          <input
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('home.namePlaceholder')}
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

  const hitTarget = (() => {
    if (!selectedCard || !round.laid.human) return null;
    const card = human.hand.find((c) => c.id === selectedCard);
    if (!card) return null;
    for (const t of round.players) {
      const tl = round.laid[t.id];
      if (!tl) continue;
      for (let gi = 0; gi < tl.groups.length; gi++) {
        if (canHitCard(card, tl.groups[gi])) return { targetId: t.id, groupIndex: gi };
      }
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* opponents */}
      <div className="flex gap-2 p-2 overflow-x-auto">
        {opponents.map((o) => (
          <div key={o.id} className="bg-slate-800/60 rounded-xl p-2 min-w-[110px] flex items-center gap-2">
            <CardBack small />
            <div>
              <div className="font-semibold text-sm">{o.name}</div>
              <div className="text-xs text-slate-300">{t('game.phase', { n: o.phaseIndex + 1 })}</div>
              <div className="text-xs text-slate-300">{t('game.cards', { count: o.hand.length })}</div>
              {round.laid[o.id] && <div className="text-xs text-green-400">{t('game.laid')}</div>}
              {round.skipInFront[o.id] && <div className="text-xs text-amber-400">{t('game.skipped')}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* table */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <div className="flex gap-6">
          <button
            className="flex flex-col items-center justify-center gap-1 disabled:opacity-50"
            disabled={!isHumanTurn || round.turnStep !== 'draw' || round.drawPile.length === 0}
            onClick={() => { humanDraw('draw'); setSelectedCard(null); }}
          >
            <CardBack />
            <span className="text-xs mt-1">{t('game.draw')} ({round.drawPile.length})</span>
          </button>
          <button
            className="w-20 h-28 rounded-lg flex items-center justify-center border-2 border-slate-500 disabled:opacity-50 bg-slate-700"
            disabled={!isHumanTurn || round.turnStep !== 'draw' || !topDiscard}
            onClick={() => { humanDraw('discard'); setSelectedCard(null); }}
          >
            {topDiscard ? <CardView card={topDiscard} small /> : <span className="text-xs">{t('game.discardPile')}</span>}
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
        <div className="flex -space-x-3 overflow-x-auto pb-2 items-end justify-center">
          {human.hand.map((card) => (
            <CardView
              key={card.id}
              card={card}
              selected={selectedCard === card.id}
              onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
            />
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
                const target = round.players.find((p) => p.id !== 'human' && !round.skipInFront[p.id] && round.lastSkipped !== p.id);
                if (target) humanDiscard(selectedCard, target.id);
              } else {
                humanDiscard(selectedCard);
              }
              setSelectedCard(null);
            }}
          >
            {t('game.discardSelected')}
          </button>
          <button
            className="px-3 py-2 rounded bg-emerald-600 text-sm disabled:opacity-50"
            disabled={!isHumanTurn || round.turnStep !== 'play' || !hitTarget}
            onClick={() => {
              if (!selectedCard || !hitTarget) return;
              humanHit(selectedCard, hitTarget.targetId, hitTarget.groupIndex);
              setSelectedCard(null);
            }}
          >
            Hit
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
