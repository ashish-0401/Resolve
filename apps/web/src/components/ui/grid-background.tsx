import { cn } from '@/lib/utils';

export function GridBackground({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative min-h-screen bg-black', className)}>
      {/* Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />
      {/* Radial gradient orb */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,transparent_70%)] pointer-events-none" />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
