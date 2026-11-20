import { motion } from 'framer-motion';

const COLOR_BG: Record<string, string> = {
  red: 'from-red-500 to-red-700',
  blue: 'from-blue-500 to-blue-700',
  yellow: 'from-yellow-400 to-yellow-600',
  green: 'from-green-500 to-green-700',
};

export function CardView({ card, selected, onClick, small }: { card: any; selected?: boolean; onClick?: () => void; small?: boolean }) {
  const isWild = card.kind === 'wild';
  const isSkip = card.kind === 'skip';
  const gradientClass = isSkip
    ? 'from-slate-600 to-slate-800'
    : COLOR_BG[card.color] ?? 'from-slate-400 to-slate-600';

  const label = card.kind === 'number' ? card.value : card.kind === 'wild' ? 'W' : 'S';
  const cornerLabel = card.kind === 'number' ? card.value : card.kind === 'wild' ? 'W' : 'S';

  const size = small ? 'w-14 h-20 text-lg' : 'w-20 h-28 text-3xl';

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -6 }}
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: selected ? -14 : 0, rotate: selected ? 2 : 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onClick={onClick}
      className={`relative ${size} rounded-2xl bg-gradient-to-br ${gradientClass} shadow-xl border border-white/30 flex items-center justify-center font-extrabold text-white shrink-0 ${selected ? 'ring-4 ring-white/90 z-10' : ''}`}
      style={{ transformOrigin: 'bottom center' }}
    >
      {/* corner indices */}
      <span className="absolute top-1 left-2 text-[10px] font-bold leading-none opacity-90">{cornerLabel}</span>
      <span className="absolute bottom-1 right-2 text-[10px] font-bold leading-none opacity-90 rotate-180">{cornerLabel}</span>
      {/* center */}
      <span className="drop-shadow-lg">{label}</span>
      {isWild && <span className="absolute bottom-2 left-2 text-[9px] font-semibold opacity-90">WILD</span>}
      {isSkip && <span className="absolute bottom-2 left-2 text-[9px] font-semibold opacity-90">SKIP</span>}
    </motion.button>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  const size = small ? 'w-14 h-20' : 'w-20 h-28';
  return (
    <div className={`${size} rounded-2xl bg-gradient-to-br from-indigo-700 to-indigo-900 shadow-xl border border-white/20 flex items-center justify-center shrink-0`}>
      <div className="w-3/4 h-3/4 rounded-xl border-2 border-white/30 flex items-center justify-center">
        <span className="text-white/60 text-xs font-bold">P10</span>
      </div>
    </div>
  );
}

export default CardView;
