import { useState } from 'react';
import { api, Transfer } from '../api';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface SettleTabProps {
  transfers: Transfer[];
  groupId: string;
  currentUserId: string;
  onPayment: () => void;
}

export function SettleTab({ transfers, groupId, currentUserId, onPayment }: SettleTabProps) {
  const [paying, setPaying] = useState<string | null>(null);

  if (transfers.length === 0) {
    return (
      <div className="text-center pt-12">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-lg font-bold text-zinc-100">Everyone's even!</p>
          <p className="text-zinc-500 mt-1 text-sm">No one needs to pay anything.</p>
        </motion.div>
      </div>
    );
  }

  const handlePay = async (transfer: Transfer) => {
    setPaying(`${transfer.from.id}-${transfer.to.id}`);
    try {
      await api.createPayment(groupId, transfer.to.id, transfer.amount);
      onPayment();
    } catch {
      // handle error
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Explanation */}
      <GlowCard className="text-center">
        <p className="text-[15px] font-semibold text-zinc-100">
          {transfers.length} payment{transfers.length !== 1 ? 's' : ''} to make everyone even:
        </p>
        <p className="text-xs text-zinc-500 mt-1.5">
          No one pays extra — this is the minimum needed to settle up
        </p>
      </GlowCard>

      {/* Transfer cards */}
      {transfers.map((t, i) => {
        const isCurrentUser = t.from.id === currentUserId;
        const key = `${t.from.id}-${t.to.id}`;
        const fromName = t.from.id === currentUserId ? 'You' : t.from.firstName;
        const toName = t.to.id === currentUserId ? 'you' : t.to.firstName;

        return (
          <GlowCard
            key={i}
            delay={i * 0.08}
            glowColor={isCurrentUser ? 'violet' : 'amber'}
            className={isCurrentUser ? 'border-violet-500/30' : ''}
          >
            {/* Sentence format */}
            <div className="text-base leading-relaxed">
              <span className="font-bold text-zinc-100">{fromName}</span>
              {' pay'}{fromName === 'You' ? '' : 's'}{' '}
              <span className="font-black text-lg text-amber-400">
                ₹{t.amount.toLocaleString()}
              </span>
              {' to '}
              <span className="font-bold text-zinc-100">{toName}</span>
            </div>

            {/* Pay button for current user */}
            {isCurrentUser && (
              <Button
                className="w-full mt-4"
                onClick={() => handlePay(t)}
                disabled={paying === key}
              >
                {paying === key ? 'Sending...' : `I've paid ₹${t.amount.toLocaleString()} ✓`}
              </Button>
            )}
          </GlowCard>
        );
      })}

      <p className="text-center text-xs text-zinc-600 mt-2">
        After paying (UPI/cash), tap the button so the group knows ✓
      </p>
    </div>
  );
}
