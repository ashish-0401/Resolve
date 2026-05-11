import { Balance } from '../api';
import { GlowCard } from '@/components/ui/glow-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const COLORS = ['bg-violet-500/20 text-violet-300', 'bg-emerald-500/20 text-emerald-300', 'bg-amber-500/20 text-amber-300', 'bg-pink-500/20 text-pink-300', 'bg-blue-500/20 text-blue-300', 'bg-orange-500/20 text-orange-300'];

export function BalancesTab({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) {
    return (
      <div className="text-center pt-12 text-zinc-400">
        <p className="text-4xl mb-2">💰</p>
        <p>No expenses yet — add one to get started!</p>
      </div>
    );
  }

  const sorted = [...balances].sort((a, b) => b.balance - a.balance);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((b, i) => {
        const isPositive = b.balance > 0;
        const isZero = b.balance === 0;

        return (
          <GlowCard
            key={b.user.id}
            delay={i * 0.05}
            glowColor={isPositive ? 'green' : isZero ? 'violet' : 'red'}
          >
            <div className="flex items-center gap-3.5">
              <Avatar>
                <AvatarFallback className={COLORS[i % COLORS.length]}>
                  {b.user.firstName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-base">{b.user.firstName}</div>
                <p className="text-sm text-zinc-400 mt-1">
                  {isPositive ? (
                    <>Paid <span className="font-bold text-emerald-400">₹{b.balance.toLocaleString()}</span> extra — others owe them</>
                  ) : isZero ? (
                    <span className="text-emerald-400">All even ✓</span>
                  ) : (
                    <>Owes <span className="font-bold text-red-400">₹{Math.abs(b.balance).toLocaleString()}</span> to the group</>
                  )}
                </p>
              </div>
            </div>
          </GlowCard>
        );
      })}

      <p className="text-center text-xs text-zinc-600 mt-3">
        💡 Tap <span className="text-zinc-400 font-medium">Settle Up</span> to see who pays whom
      </p>
    </div>
  );
}
