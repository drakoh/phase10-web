import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const RULES_EN = [
  { title: 'Objective', body: 'Be the first player to complete all 10 Phases. A Phase is a specific combination of cards (sets, runs, same color).' },
  { title: 'Turn', body: '1) Draw a card (from draw pile or discard pile). 2) Lay down your Phase if you can. 3) Hit on completed Phases. 4) Discard one card.' },
  { title: 'Phase', body: 'Phases must be completed in order. If you fail to complete a Phase before someone goes out, you retry the same Phase next round.' },
  { title: 'Hit', body: 'After laying your Phase, you may place leftover cards onto any completed Phase (yours or opponents\') if they fit: same number for a set, consecutive number for a run, same color for color phases. This helps you get rid of cards.' },
  { title: 'Going out', body: 'Get rid of all your cards (by hitting or discarding your last card) to end the round. The first to go out wins the round.' },
  { title: 'Scoring', body: 'Winner scores 0. Others score leftover hand cards: 1–9 = 5 pts, 10–12 = 10 pts, Skip = 15 pts, Wild = 25 pts. Lowest total wins ties.' },
  { title: 'Special cards', body: 'Wild = any number/color. Skip = skip a player\'s turn (cannot be picked up from discard, cannot be used in a Phase).' },
];

const RULES_FR = [
  { title: 'Objectif', body: 'Être le premier à compléter les 10 Phases. Une Phase est une combinaison précise de cartes (séries, suites, même couleur).' },
  { title: 'Tour', body: '1) Piocher une carte (pile ou défausse). 2) Poser votre Phase si possible. 3) Ajouter des cartes sur des Phases complétées. 4) Défausser une carte.' },
  { title: 'Phase', body: 'Les Phases se complètent dans l\'ordre. Si vous n\'y arrivez pas avant qu\'un joueur sorte, vous rejouez la même Phase à la manche suivante.' },
  { title: 'Ajout (Hit)', body: 'Après avoir posé votre Phase, vous pouvez déposer vos cartes restantes sur n\'importe quelle Phase complétée (la vôtre ou celle d\'un adversaire) si elles s\'y intègrent : même nombre pour une série, nombre consécutif pour une suite, même couleur pour une Phase couleur. Cela aide à se débarrasser de ses cartes.' },
  { title: 'Sortir', body: 'Débarrassez-vous de toutes vos cartes (en ajoutant ou en défaussant la dernière) pour terminer la manche. Le premier à sortir gagne la manche.' },
  { title: 'Score', body: 'Le gagnant marque 0. Les autres marquent leurs cartes restantes : 1–9 = 5 pts, 10–12 = 10 pts, Passe = 15 pts, Joker = 25 pts. Le plus petit total gagne en cas d\'égalité.' },
  { title: 'Cartes spéciales', body: 'Joker = n\'importe quel nombre/couleur. Passe = fait sauter le tour d\'un joueur (ne peut pas être ramassée de la défausse, ne peut pas être utilisée dans une Phase).' },
];

export default function Rules({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation();
  const rules = i18n.language === 'fr' ? RULES_FR : RULES_EN;
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
          className="bg-slate-900 text-white border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Rules</h2>
            <button className="px-3 py-1 rounded bg-slate-700 text-sm" onClick={onClose}>Close</button>
          </div>
          <div className="flex flex-col gap-3">
            {rules.map((r) => (
              <div key={r.title} className="bg-slate-800/60 rounded-xl p-3">
                <div className="font-semibold mb-1">{r.title}</div>
                <div className="text-sm text-slate-200">{r.body}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
