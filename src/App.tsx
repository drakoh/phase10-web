import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from './state/gameStore';
import { useProgressStore } from './state/progressStore';
import { exportProgressJson, importProgressJson } from './persistence/db';
import { LEVELS } from './progression/levels';
import { canLayPhase, canHitCard } from './engine/rules';
import CardView, { CardBack } from './components/Card';
import Legend from './components/Legend';
import Rules from './components/Rules';
import { toggleSound, isSoundOn } from './audio/audio';
import './App.css';

export default function App() {
  const { t, i18n } = useTranslation();
  const { round, lastScores, gameWinner, startMatch, humanDraw, humanLayPhase, humanHit, humanDiscard, reorderHand, reset } = useGameStore();
  const progress = useProgressStore();
  useEffect(() => { progress.load(); }, []);
  useEffect(() => {
    const el = handRef.current;
    if (!el || !round) return;
    const humanP = round.players.find((p) => p.id === 'human');
    if (!humanP || humanP.hand.length <= 1) { setHandOverlap(0); return; }
    const cardEl = el.querySelector('div');
    const cardWidth = cardEl ? cardEl.clientWidth : 80;
    const available = el.clientWidth;
    const total = humanP.hand.length * cardWidth;
    if (total <= available) setHandOverlap(0);
    else setHandOverlap((total - available) / (humanP.hand.length - 1));
  }, [round]);
  const [name, setName] = useState('You');
  const [quickPlay, setQuickPlay] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundOn());
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const [handOverlap, setHandOverlap] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('easy');
  const [aiCount, setAiCount] = useState(1);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (gameWinner) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 gap-4 relative">
        <h1 className="text-3xl font-bold">{t('app.title')}</h1>
        <p className="text-green-400 text-xl">{t('game.winner', { name: gameWinner })}</p>
        <button className="px-4 py-3 rounded bg-blue-600 font-semibold" onClick={() => reset()}>
          {t('home.start')}
        </button>
      </div>
    );
  }

  if (!round) {
    return (<>
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
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs ml-2"
            onClick={() => setSoundOn(toggleSound())}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs ml-2"
            onClick={() => setShowLegend(true)}
          >
            {t('common.phases')}
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs ml-2"
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.unregister()));
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
              } catch { /* ignore */ }
              window.location.reload();
            }}
          >
            ⟳
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs ml-2"
            onClick={() => setShowRules(true)}
          >
            {t('common.rules')}
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
            value={aiCount}
            onChange={(e) => setAiCount(Number(e.target.value))}
          >
            <option value={1}>{t('home.opponents', { count: 1 })}</option>
            <option value={2}>{t('home.opponents', { count: 2 })}</option>
            <option value={3}>{t('home.opponents', { count: 3 })}</option>
          </select>

          {/* Journey */}
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Journey</span>
              <span className="text-xs text-slate-400">Lv {progress.playerLevel} · {progress.xp} XP</span>
            </div>
            <div className="text-sm text-slate-300 mb-2">
              Level {progress.currentLevel + 1} / {LEVELS.length}
              {' · '}
              {LEVELS[progress.currentLevel].phases} phase(s)
              {' · '}
              {LEVELS[progress.currentLevel].difficulty}
            </div>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: LEVELS.length }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded ${i < progress.unlocked ? (progress.stars[i] ? 'bg-yellow-400' : 'bg-slate-500') : 'bg-slate-700'}`}
                />
              ))}
            </div>
            <button
              className="w-full px-4 py-3 rounded bg-blue-600 font-semibold disabled:opacity-50"
              disabled={progress.currentLevel >= progress.unlocked - 1 && progress.currentLevel >= LEVELS.length - 1 ? false : false}
              onClick={() => {
                const cfg = LEVELS[progress.currentLevel];
                startMatch({ humanName: name, difficulty: cfg.difficulty, aiCount, targetPhases: cfg.phases });
              }}
            >
              {t('home.playLevel', { n: progress.currentLevel + 1 })}
            </button>
            <div className="flex justify-between mt-2">
              <button
                className="text-xs text-slate-400 disabled:opacity-30"
                disabled={progress.currentLevel <= 0}
                onClick={() => progress.setCurrentLevel(progress.currentLevel - 1)}
              >
                ◀ Prev
              </button>
              <button
                className="text-xs text-slate-400 disabled:opacity-30"
                disabled={progress.currentLevel >= progress.unlocked - 1 || progress.currentLevel >= LEVELS.length - 1}
                onClick={() => progress.setCurrentLevel(progress.currentLevel + 1)}
              >
                Next ▶
              </button>
            </div>
          </div>

          {/* Quick play toggle */}
          <button
            className="text-xs text-slate-400 underline self-start"
            onClick={() => setQuickPlay((q) => !q)}
          >
            {quickPlay ? t('home.hideQuickPlay') : t('home.quickPlay')}
          </button>

          <div className="flex gap-2">
            <button
              className="text-xs px-2 py-1 rounded bg-slate-700"
              onClick={async () => {
                const json = await exportProgressJson();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'phase10-progress.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
            <label className="text-xs px-2 py-1 rounded bg-slate-700 cursor-pointer">
              Import
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  await importProgressJson(text);
                  await progress.load();
                }}
              />
            </label>
          </div>
          {quickPlay && (
            <>
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
              <button
                className="px-4 py-3 rounded bg-slate-700 font-semibold"
                onClick={() => startMatch({ humanName: name, difficulty, aiCount, targetPhases: 10 })}
              >
                {t('home.customGame')}
              </button>
            </>
          )}
        </div>
        {gameWinner && <p className="text-green-400">Winner: {gameWinner}</p>}
      </div>
      {showLegend && <Legend onClose={() => setShowLegend(false)} />}
      {showRules && <Rules onClose={() => setShowRules(false)} />}
    </>);
  }

  const human = round.players.find((p) => p.id === 'human')!;
  const opponents = round.players.filter((p) => p.id !== 'human');
  const cardSize = opponents.length <= 1 ? 'lg' : opponents.length === 2 ? 'md' : 'sm';
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
    <>
    <div className="relative h-screen bg-slate-900 text-white flex flex-col max-w-6xl mx-auto w-full overflow-hidden">
      {/* opponents */}
      <div className="flex gap-2 p-1 overflow-x-auto shrink-0">
        {opponents.map((o) => (
          <div key={o.id} className="bg-slate-800/60 rounded-lg p-1 min-w-[90px] flex items-center gap-1 text-xs">
            <CardBack small />
            <div>
              <div className="font-semibold">{o.name}</div>
              <div className="text-slate-300">{t('game.phase', { n: o.phaseIndex + 1 })} · {o.hand.length}c</div>
              {round.laid[o.id] && <div className="text-green-400">{t('game.laid')}</div>}
              {round.skipInFront[o.id] && <div className="text-amber-400">{t('game.skipped')}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* phase objective (1 liner) */}
      <div className="mx-2 mt-1 rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-1 text-center text-sm">
        <span className="text-slate-400">{t('game.phase', { n: human.phaseIndex + 1 })}:</span>{' '}
        <span className="font-semibold text-white">{t(`phases.${human.phaseIndex}`)}</span>
      </div>

      {/* table */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-2 min-h-0">
        <div className="flex gap-4 items-center">
          <button
            className="flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
            disabled={!isHumanTurn || round.turnStep !== 'draw' || round.drawPile.length === 0}
            onClick={() => { humanDraw('draw'); setSelectedCard(null); }}
          >
            <CardBack size={cardSize} />
            <span className="text-[10px] mt-0.5">{t('game.draw')} ({round.drawPile.length})</span>
          </button>
          <button
            className="flex items-center justify-center disabled:opacity-50"
            disabled={!isHumanTurn || round.turnStep !== 'draw' || !topDiscard}
            onClick={() => { humanDraw('discard'); setSelectedCard(null); }}
          >
            {topDiscard ? <CardView card={topDiscard} size={cardSize} /> : <span className="text-xs">{t('game.discardPile')}</span>}
          </button>
        </div>

        {round.laid.human && (
          <div className="text-xs text-green-400">
            Phase laid. Discard or hit cards to go out. To hit: select a card that fits a laid phase, then tap Hit (or drag it onto a phase).
          </div>
        )}

        {/* Laid phases / drop targets (compact) */}
        <div className="w-full flex flex-wrap gap-1 justify-center max-h-20 overflow-y-auto">
          {round.players.map((p) => {
            const laid = round.laid[p.id];
            if (!laid) return null;
            return (
              <div key={p.id} className="bg-slate-800/60 rounded-lg p-1 border border-slate-700 flex items-center gap-1">
                <span className="text-[10px] text-slate-300">{p.name}</span>
                {laid.groups.map((g, gi) => (
                  <div
                    key={gi}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
                      if (cardId) humanHit(cardId, p.id, gi);
                      setDraggedCardId(null);
                    }}
                    className="flex items-center gap-0.5 rounded border border-dashed border-slate-500 p-0.5 hover:border-white/60 transition"
                  >
                    {g.cardObjs && g.cardObjs.length > 0 ? (
                      g.cardObjs.map((c, ci) => <CardView key={ci} card={c} size="sm" />)
                    ) : (
                      <span className="text-[10px] text-slate-300 px-1">{g.kind[0].toUpperCase()}×{g.cards.length}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

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
        {human.hand.length > 6 ? (
          <div className="flex flex-col gap-1 px-2 pt-4">
            <div className="flex items-end justify-center gap-0.5 opacity-60">
              {human.hand.slice(0, Math.ceil(human.hand.length / 2)).map((card, idx) => {
                const index = idx;
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggedCardId(card.id);
                      setDragOverIndex(null);
                      e.dataTransfer.setData('text/plain', card.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggedCardId || draggedCardId === card.id) return;
                      if (dragOverIndex === index) return;
                      const from = human.hand.findIndex((c) => c.id === draggedCardId);
                      if (from === -1 || from === index) return;
                      const next = [...human.hand];
                      const [moved] = next.splice(from, 1);
                      next.splice(index, 0, moved);
                      reorderHand(next);
                      setDragOverIndex(index);
                    }}
                    onDragEnd={() => { setDraggedCardId(null); setDragOverIndex(null); }}
                    className="relative cursor-grab active:cursor-grabbing"
                  >
                    <CardView
                      card={card}
                      selected={selectedCard === card.id}
                      size="sm"
                      onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
                      onMoveLeft={() => {
                        const i = human.hand.findIndex((c) => c.id === card.id);
                        if (i < 0) return;
                        const next = [...human.hand];
                        const [moved] = next.splice(i, 1);
                        const newIdx = i === 0 ? next.length : i - 1;
                        next.splice(newIdx, 0, moved);
                        reorderHand(next);
                      }}
                      onMoveRight={() => {
                        const i = human.hand.findIndex((c) => c.id === card.id);
                        if (i < 0) return;
                        const next = [...human.hand];
                        const [moved] = next.splice(i, 1);
                        const newIdx = i >= next.length ? 0 : i + 1;
                        next.splice(newIdx, 0, moved);
                        reorderHand(next);
                      }}
                      onMoveDown={() => {
                        const i = human.hand.findIndex((c) => c.id === card.id);
                        if (i < 0) return;
                        const half = Math.ceil(human.hand.length / 2);
                        const next = [...human.hand];
                        const [moved] = next.splice(i, 1);
                        next.splice(half, 0, moved);
                        reorderHand(next);
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              ref={handRef}
              className="flex items-end justify-center gap-1 min-h-[80px] pt-2"
              onDragOver={(e) => e.preventDefault()}
            >
              {human.hand.slice(Math.ceil(human.hand.length / 2)).map((card, idx) => {
                const index = Math.ceil(human.hand.length / 2) + idx;
                return (
                  <div
                    key={card.id}
                    draggable
                    style={{ marginLeft: idx === 0 ? 0 : -handOverlap }}
                    onDragStart={(e) => {
                      setDraggedCardId(card.id);
                      setDragOverIndex(null);
                      e.dataTransfer.setData('text/plain', card.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggedCardId || draggedCardId === card.id) return;
                      if (dragOverIndex === index) return;
                      const from = human.hand.findIndex((c) => c.id === draggedCardId);
                      if (from === -1 || from === index) return;
                      const next = [...human.hand];
                      const [moved] = next.splice(from, 1);
                      next.splice(index, 0, moved);
                      reorderHand(next);
                      setDragOverIndex(index);
                    }}
                    onDragEnd={() => { setDraggedCardId(null); setDragOverIndex(null); }}
                    className="relative cursor-grab active:cursor-grabbing"
                  >
                    <CardView
                      card={card}
                      selected={selectedCard === card.id}
                      size={cardSize}
                      onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
                      onMoveLeft={() => {
                        const i = human.hand.findIndex((c) => c.id === card.id);
                        if (i < 0) return;
                        const next = [...human.hand];
                        const [moved] = next.splice(i, 1);
                        const newIdx = i === 0 ? next.length : i - 1;
                        next.splice(newIdx, 0, moved);
                        reorderHand(next);
                      }}
                      onMoveRight={() => {
                        const i = human.hand.findIndex((c) => c.id === card.id);
                        if (i < 0) return;
                        const next = [...human.hand];
                        const [moved] = next.splice(i, 1);
                        const newIdx = i >= next.length ? 0 : i + 1;
                        next.splice(newIdx, 0, moved);
                        reorderHand(next);
                      }}
                      onMoveUp={() => {
                        const i = human.hand.findIndex((c) => c.id === card.id);
                        if (i < 0) return;
                        const half = Math.ceil(human.hand.length / 2);
                        const next = [...human.hand];
                        const [moved] = next.splice(i, 1);
                        next.splice(half - 1, 0, moved);
                        reorderHand(next);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            ref={handRef}
            className="flex pb-1 items-end justify-center min-h-[80px] px-2 pt-6"
            onDragOver={(e) => e.preventDefault()}
          >
            {human.hand.map((card, index) => (
              <div
                key={card.id}
                className="relative"
                style={{ marginLeft: index === 0 ? 0 : -handOverlap }}
              >
                <div
                  draggable
                  onDragStart={(e) => {
                    setDraggedCardId(card.id);
                    setDragOverIndex(null);
                    e.dataTransfer.setData('text/plain', card.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!draggedCardId || draggedCardId === card.id) return;
                    if (dragOverIndex === index) return;
                    const from = human.hand.findIndex((c) => c.id === draggedCardId);
                    if (from === -1 || from === index) return;
                    const next = [...human.hand];
                    const [moved] = next.splice(from, 1);
                    next.splice(index, 0, moved);
                    reorderHand(next);
                    setDragOverIndex(index);
                  }}
                  onDragEnd={() => { setDraggedCardId(null); setDragOverIndex(null); }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <CardView
                    card={card}
                    selected={selectedCard === card.id}
                    size={cardSize}
                    onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
                    onMoveLeft={() => {
                      const idx = human.hand.findIndex((c) => c.id === card.id);
                      if (idx < 0) return;
                      const next = [...human.hand];
                      const [moved] = next.splice(idx, 1);
                      const newIdx = idx === 0 ? next.length : idx - 1;
                      next.splice(newIdx, 0, moved);
                      reorderHand(next);
                    }}
                    onMoveRight={() => {
                      const idx = human.hand.findIndex((c) => c.id === card.id);
                      if (idx < 0) return;
                      const next = [...human.hand];
                      const [moved] = next.splice(idx, 1);
                      const newIdx = idx >= next.length ? 0 : idx + 1;
                      next.splice(newIdx, 0, moved);
                      reorderHand(next);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      <div className="flex gap-1 mt-1 flex-wrap">
          <button
            className="px-2 py-1 rounded bg-indigo-600 text-xs disabled:opacity-50"
            disabled={!canLay}
            onClick={() => { humanLayPhase(); setSelectedCard(null); }}
          >
            {t('game.layPhase')}
          </button>
          <button
            className="px-2 py-1 rounded bg-amber-600 text-xs disabled:opacity-50"
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
            className="px-2 py-1 rounded bg-emerald-600 text-xs disabled:opacity-50"
            disabled={!isHumanTurn || round.turnStep !== 'play' || !hitTarget}
            onClick={() => {
              if (!selectedCard || !hitTarget) return;
              humanHit(selectedCard, hitTarget.targetId, hitTarget.groupIndex);
              setSelectedCard(null);
            }}
          >
            {t('game.hit')}
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-600 text-xs"
            onClick={() => { reset(); }}
          >
            {t('game.quit')}
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs"
            onClick={() => setShowLegend(true)}
          >
            {t('common.phases')}
          </button>
          <button
            className="px-2 py-1 rounded bg-amber-700 text-xs"
            onClick={() => {
              if (!round) return;
              if (round.turnStep === 'draw') {
                const top = round.discardPile.length ? round.discardPile[round.discardPile.length - 1] : null;
                setHint(top && top.kind !== 'skip' ? t('game.hintDrawDiscard') : t('game.hintDrawPile'));
                return;
              }
              const layout = canLayPhase(round, 'human');
              if (layout && !round.laid.human) {
                setHint(t('game.hintLayPhase'));
                return;
              }
              // find a hit
              if (round.laid.human) {
                for (const c of human.hand) {
                  for (const p of round.players) {
                    const tl = round.laid[p.id];
                    if (!tl) continue;
                    for (let gi = 0; gi < tl.groups.length; gi++) {
                      if (canHitCard(c, tl.groups[gi])) {
                        setHint(t('game.hintHit', { card: c.kind === 'number' ? c.value : c.kind, target: p.id === 'human' ? (i18n.language === 'fr' ? 'votre' : 'your') : p.name }));
                        return;
                      }
                    }
                  }
                }
              }
              // suggest discard lowest
              const candidates = human.hand.filter((c) => c.kind !== 'skip' || true);
              if (candidates.length) {
                const worst = [...candidates].sort((a, b) => {
                  const pa = a.kind === 'number' ? a.value : a.kind === 'skip' ? 15 : 25;
                  const pb = b.kind === 'number' ? b.value : b.kind === 'skip' ? 15 : 25;
                  return pa - pb;
                })[0];
                setHint(t('game.hintDiscard', { card: worst.kind === 'number' ? worst.value : worst.kind, color: worst.kind === 'number' ? worst.color : '' }));
              } else {
                setHint(t('game.hintNoMove'));
              }
            }}
          >
            Hint
          </button>
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs"
            onClick={() => setShowRules(true)}
          >
            {t('common.rules')}
          </button>
          {null}
          <button
            className="px-2 py-1 rounded bg-slate-700 text-xs"
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.unregister()));
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
              } catch { /* ignore */ }
              window.location.reload();
            }}
          >
            ⟳
          </button>
        </div>
        {selectedCard && !hitTarget && round.laid.human && (
          <div className="text-[10px] text-amber-400">Selected card doesn't fit any laid phase.</div>
        )}
        {hint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 text-[10px] text-blue-100 bg-slate-800/90 border border-slate-600 rounded px-2 py-1 max-w-[90%] truncate">
            {hint} <button className="underline ml-1" onClick={() => setHint(null)}>×</button>
          </div>
        )}
        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
          {t('game.turn', { name: round.players[round.currentPlayerIndex].name, step: round.turnStep })} {isHumanTurn ? '' : '— AI'}
        </div>
      </div>
    </div>
    {showLegend && <Legend onClose={() => setShowLegend(false)} currentPhase={human.phaseIndex} />}
    {showRules && <Rules onClose={() => setShowRules(false)} />}
    </>
  );
}
