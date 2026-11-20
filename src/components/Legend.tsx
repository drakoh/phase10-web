import { motion, AnimatePresence } from 'framer-motion';
import CardView from './Card';
import { useTranslation } from 'react-i18next';

function C(kind: string, value?: number, color?: string, id?: string) {
  if (kind === 'number') return { kind: 'number', value: value!, color: color as any, id: id ?? `${color}${value}` };
  if (kind === 'wild') return { kind: 'wild', color: color as any, id: id ?? `w${color}` };
  return { kind: 'skip', id: id ?? 's' };
}

const EXAMPLES: { phase: number; cards: any[] }[] = [
  { phase: 0, cards: [C('number',5,'red','a'),C('number',5,'blue','b'),C('number',5,'green','c'),C('number',7,'red','d'),C('number',7,'blue','e'),C('number',7,'green','f')] },
  { phase: 1, cards: [C('number',8,'red','a'),C('number',8,'blue','b'),C('number',8,'green','c'),C('number',3,'red','d'),C('number',4,'blue','e'),C('number',5,'green','f'),C('number',6,'yellow','g')] },
  { phase: 2, cards: [C('number',2,'red','a'),C('number',2,'blue','b'),C('number',2,'green','c'),C('number',2,'yellow','d'),C('number',3,'red','e'),C('number',4,'blue','f'),C('number',5,'green','g'),C('number',6,'yellow','h')] },
  { phase: 3, cards: [1,2,3,4,5,6,7].map((v,i)=>C('number',v,'red',`r${i}`)) },
  { phase: 4, cards: [2,3,4,5,6,7,8,9].map((v,i)=>C('number',v,'blue',`b${i}`)) },
  { phase: 5, cards: [1,2,3,4,5,6,7,8,9].map((v,i)=>C('number',v,'green',`g${i}`)) },
  { phase: 6, cards: [C('number',3,'red','a'),C('number',3,'blue','b'),C('number',3,'green','c'),C('number',3,'yellow','d'),C('number',9,'red','e'),C('number',9,'blue','f'),C('number',9,'green','g'),C('number',9,'yellow','h')] },
  { phase: 7, cards: [1,2,3,4,5,6,7].map((v,i)=>C('number',v,'yellow',`y${i}`)) },
  { phase: 8, cards: [C('number',4,'red','a'),C('number',4,'blue','b'),C('number',4,'green','c'),C('number',4,'yellow','d'),C('number',4,'red','e'),C('number',9,'red','f'),C('number',9,'blue','g')] },
  { phase: 9, cards: [C('number',6,'red','a'),C('number',6,'blue','b'),C('number',6,'green','c'),C('number',6,'yellow','d'),C('number',6,'red','e'),C('number',10,'red','f'),C('number',10,'blue','g'),C('number',10,'green','h')] },
];

export default function Legend({ onClose, currentPhase }: { onClose: () => void; currentPhase?: number }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 text-white border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Phase Legend</h2>
            <button className="px-3 py-1 rounded bg-slate-700 text-sm" onClick={onClose}>Close</button>
          </div>
          <div className="flex flex-col gap-4">
            {EXAMPLES.map((ex) => {
              const isCurrent = currentPhase === ex.phase;
              return (
                <div
                  key={ex.phase}
                  className={`rounded-xl p-3 border ${isCurrent ? 'bg-blue-900/60 border-blue-400' : 'bg-slate-800/60 border-slate-700'}`}
                >
                  <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                    Phase {ex.phase + 1}: {t(`phases.${ex.phase}`)}
                    {isCurrent && <span className="text-xs px-2 py-0.5 rounded bg-blue-500">Current target</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ex.cards.map((c, i) => (
                      <CardView key={i} card={c} small />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
