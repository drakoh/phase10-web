import { motion } from 'framer-motion';

function cardSrc(card: any): string {
  const base = '/phase10-web/cards/';
  if (card.kind === 'number') return `${base}${card.value}${card.color[0].toUpperCase()}.png`;
  if (card.kind === 'wild') return `${base}W${card.color[0].toUpperCase()}.png`;
  return `${base}S.png`;
}

export function CardView({ card, selected, onClick, small }: { card: any; selected?: boolean; onClick?: () => void; small?: boolean }) {
  const size = small
    ? 'w-14 h-20 sm:w-16 sm:h-22'
    : 'w-20 h-28 sm:w-24 sm:h-34 md:w-28 md:h-40';

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -6 }}
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: selected ? -14 : 0, rotate: selected ? 2 : 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onClick={onClick}
      className={`relative ${size} rounded-2xl overflow-hidden shadow-2xl shrink-0 bg-transparent border-0 p-0 ${selected ? 'ring-4 ring-white/90 z-10' : ''}`}
      style={{ transformOrigin: 'bottom center' }}
    >
      <img src={cardSrc(card)} alt="" className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />
    </motion.button>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  const size = small
    ? 'w-14 h-20 sm:w-16 sm:h-22'
    : 'w-20 h-28 sm:w-24 sm:h-34 md:w-28 md:h-40';
  return (
    <img
      src="/phase10-web/cards/BACK.png"
      alt=""
      className={`${size} rounded-2xl shadow-2xl object-contain shrink-0`}
      draggable={false}
    />
  );
}

export default CardView;
