import { motion } from 'framer-motion';

interface TextShimmerProps {
  children: string;
  className?: string;
}

export function TextShimmer({ children, className = '' }: TextShimmerProps) {
  return (
    <motion.span
      className={`inline-block bg-gradient-to-r from-violet-400 via-fuchsia-300 to-violet-400 bg-[length:200%_100%] bg-clip-text text-transparent ${className}`}
      animate={{ backgroundPosition: ['0% 50%', '200% 50%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    >
      {children}
    </motion.span>
  );
}
