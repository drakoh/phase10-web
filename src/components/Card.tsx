import { motion } from 'framer-motion';

function cardSrc(card: any): string {
  const base = '/phase10-web/cards/';
  if (card.kind === 'number') return `${base}${card.value}${card.color[0].toUpperCase()}.png`;
  if (card.kind === 'wild') return `${base}W${card.color[0].toUpperCase()}.png`;
  return `${base}S.png`;
}

export function CardView({ card, selected, onClick, small, size: sizeProp, onMoveLeft, onMoveRight, onMoveUp, onMoveDown }: { card: any; selected?: boolean; onClick?: () => void; small?: boolean; size?: 'sm' | 'md' | 'lg'; onMoveLeft?: () => void; onMoveRight?: () => void; onMoveUp?: () => void; onMoveDown?: () => void }) {
  const sizeKey = sizeProp ?? (small ? 'sm' : 'md');
  const size = sizeKey === 'sm'
    ? 'w-12 h-16 sm:w-14 sm:h-20'
    : sizeKey === 'lg'
    ? 'w-24 h-34 sm:w-28 sm:h-40 md:w-32 md:h-44'
    : 'w-16 h-22 sm:w-20 sm:h-28 md:w-24 md:h-32';

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -8, scale: 1.05, zIndex: 50 }}
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: selected ? -14 : 0, rotate: selected ? 2 : 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onClick={onClick}
      className={`relative ${size} shadow-2xl shrink-0 bg-transparent border-0 p-0 ${selected ? 'ring-4 ring-white/90 z-10' : ''}`}
      style={{ transformOrigin: 'bottom center' }}
    >
      <img src={cardSrc(card)} alt="" className="w-full h-full object-contain pointer-events-none select-none" draggable={false} style={{ imageRendering: 'auto' }} />
      {selected && onMoveLeft && (
        <button
          className="absolute left-0 top-0 h-full w-5 bg-blue-500/50 hover:bg-blue-500/80"
          onClick={(e) => { e.stopPropagation(); onMoveLeft(); }}
        />
      )}
      {selected && onMoveRight && (
        <button
          className="absolute right-0 top-0 h-full w-5 bg-blue-500/50 hover:bg-blue-500/80"
          onClick={(e) => { e.stopPropagation(); onMoveRight(); }}
        />
      )}
      {selected && onMoveUp && (
        <button
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-5 bg-blue-500/50 hover:bg-blue-500/80"
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
        />
      )}
      {selected && onMoveDown && (
        <button
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-5 bg-blue-500/50 hover:bg-blue-500/80"
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
        />
      )}
    </motion.button>
  );
}

export function CardBack({ small, size: sizeProp }: { small?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeKey = sizeProp ?? (small ? 'sm' : 'md');
  const size = sizeKey === 'sm'
    ? 'w-12 h-16 sm:w-14 sm:h-20'
    : sizeKey === 'lg'
    ? 'w-24 h-34 sm:w-28 sm:h-40 md:w-32 md:h-44'
    : 'w-16 h-22 sm:w-20 sm:h-28 md:w-24 md:h-32';
  return (
    <img
      src="/phase10-web/cards/BACK.png"
      alt=""
      className={`${size} shadow-2xl object-contain shrink-0 bg-transparent`}
      draggable={false}
      style={{ imageRendering: 'auto' }}
    />
  );
}

export default CardView;
