import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  delay?: number;
}

export function GlowCard({ children, className, glowColor = 'violet', delay = 0 }: GlowCardProps) {
  const colorMap: Record<string, string> = {
    violet: 'hover:shadow-violet-500/20',
    green: 'hover:shadow-emerald-500/20',
    red: 'hover:shadow-red-500/20',
    amber: 'hover:shadow-amber-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl border border-zinc-800/60 bg-zinc-900/70 backdrop-blur-lg p-5 shadow-lg transition-all duration-300',
        colorMap[glowColor] || colorMap.violet,
        'hover:border-zinc-600/60 hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
