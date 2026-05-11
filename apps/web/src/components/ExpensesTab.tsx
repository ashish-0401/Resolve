import { Expense, User } from '../api';
import { GlowCard } from '@/components/ui/glow-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const COLORS = ['bg-violet-500/20 text-violet-300', 'bg-emerald-500/20 text-emerald-300', 'bg-amber-500/20 text-amber-300', 'bg-pink-500/20 text-pink-300', 'bg-blue-500/20 text-blue-300', 'bg-orange-500/20 text-orange-300'];

export function ExpensesTab({ expenses, members }: { expenses: Expense[]; members: User[] }) {
  if (expenses.length === 0) {
    return (
      <div className="text-center pt-12 text-zinc-400">
        <p className="text-4xl mb-2">📋</p>
        <p>No expenses yet.</p>
      </div>
    );
  }

  const memberMap = new Map(members.map((m, i) => [m.id, { ...m, colorIdx: i }]));
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Total summary */}
      <GlowCard className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total expenses</p>
        <p className="text-3xl font-black mt-1 tracking-tight">₹{total.toLocaleString()}</p>
        <p className="text-xs text-zinc-500 mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
      </GlowCard>

      {/* Expense list */}
      {expenses.map((exp, i) => {
        const payer = memberMap.get(exp.paidById);
        const colorClass = COLORS[(payer?.colorIdx ?? 0) % COLORS.length];

        return (
          <GlowCard key={exp.id} delay={i * 0.04}>
            <div className="flex gap-3.5">
              <Avatar className="mt-0.5">
                <AvatarFallback className={colorClass}>
                  {exp.paidBy.firstName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-[15px]">{exp.description}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {exp.paidBy.firstName} paid · {new Date(exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div className="font-bold text-base tabular-nums shrink-0 ml-2">
                    ₹{exp.amount.toLocaleString()}
                  </div>
                </div>

                {/* Split chips */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {exp.splits.map((s) => {
                    const member = memberMap.get(s.userId);
                    return (
                      <span
                        key={s.userId}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800/80 text-[11px] font-medium text-zinc-400 border border-zinc-700/50"
                      >
                        {member?.firstName ?? '?'}: ₹{s.share.toLocaleString()}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
}
