import { motion } from 'framer-motion';

const COLOR_BG: Record<string, string> = {
  red: 'from-red-500 via-red-600 to-red-800',
  blue: 'from-blue-500 via-blue-600 to-blue-800',
  yellow: 'from-yellow-300 via-yellow-400 to-yellow-600',
  green: 'from-green-500 via-green-600 to-green-800',
};

export function CardView({ card, selected, onClick, small }: { card: any; selected?: boolean; onClick?: () => void; small?: boolean }) {
  const isWild = card.kind === 'wild';
  const isSkip = card.kind === 'skip';
  const gradientClass = isSkip
    ? 'from-slate-500 via-slate-600 to-slate-800'
    : COLOR_BG[card.color] ?? 'from-slate-400 to-slate-600';

  const label = card.kind === 'number' ? card.value : card.kind === 'wild' ? 'W' : 'S';
  const size = small
    ? 'w-14 h-20 sm:w-16 sm:h-22 text-lg sm:text-xl'
    : 'w-20 h-28 sm:w-24 sm:h-34 md:w-28 md:h-40 text-3xl sm:text-4xl';

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -6 }}
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: selected ? -14 : 0, rotate: selected ? 2 : 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onClick={onClick}
      className={`relative ${size} rounded-2xl bg-gradient-to-br ${gradientClass} shadow-2xl border-2 border-white/40 flex items-center justify-center font-extrabold text-white shrink-0 overflow-hidden ${selected ? 'ring-4 ring-white/90 z-10' : ''}`}
      style={{ transformOrigin: 'bottom center' }}
    >
      {/* subtle pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="white" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#dots)" />
      </svg>
      {/* corner indices */}
      <span className="absolute top-1 left-2 text-[10px] sm:text-xs font-bold leading-none opacity-95 drop-shadow">{label}</span>
      <span className="absolute bottom-1 right-2 text-[10px] sm:text-xs font-bold leading-none opacity-95 drop-shadow rotate-180">{label}</span>
      {/* center */}
      <span className="relative drop-shadow-2xl">{label}</span>
      {isWild && <span className="absolute bottom-2 left-2 text-[8px] sm:text-[9px] font-bold opacity-90 tracking-wider">WILD</span>}
      {isSkip && <span className="absolute bottom-2 left-2 text-[8px] sm:text-[9px] font-bold opacity-90 tracking-wider">SKIP</span>}
    </motion.button>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  const size = small
    ? 'w-12 h-16 sm:w-14 sm:h-20'
    : 'w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-32';
  return (
    <div className={`${size} rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 shadow-2xl border-2 border-white/30 flex items-center justify-center shrink-0 overflow-hidden`}>
      <div className="w-4/5 h-4/5 rounded-xl border-2 border-white/40 flex items-center justify-center bg-indigo-800/40">
        <span className="text-white/80 text-xs sm:text-sm font-extrabold tracking-widest">P10</span>
      </div>
    </div>
  );
}

export default CardView;
