import { useState, useRef } from 'react';
import { api, Transfer } from '../api';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Paperclip, X, Image } from 'lucide-react';

interface SettleTabProps {
  transfers: Transfer[];
  groupId: string;
  currentUserId: string;
  onPayment: () => void;
}

export function SettleTab({ transfers, groupId, currentUserId, onPayment }: SettleTabProps) {
  const [paying, setPaying] = useState<string | null>(null);
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const handleFileSelect = (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofs((prev) => ({ ...prev, [key]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handlePay = async (transfer: Transfer) => {
    const key = `${transfer.from.id}-${transfer.to.id}`;
    setPaying(key);
    try {
      await api.createPayment(groupId, transfer.to.id, transfer.amount, proofs[key]);
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
        const proof = proofs[key];

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

            {/* Pay section for current user */}
            {isCurrentUser && (
              <div className="mt-4 space-y-3">
                {/* Proof attachment area */}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[key] = el; }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(key, file);
                  }}
                />

                {proof ? (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-700/60">
                    <img src={proof} alt="Payment proof" className="w-full h-32 object-cover" />
                    <button
                      onClick={() => setProofs((prev) => { const n = { ...prev }; delete n[key]; return n; })}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/70 flex items-center justify-center cursor-pointer"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 text-[11px] text-emerald-400 font-medium">
                      <Image className="h-3 w-3" /> Proof attached
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current[key]?.click()}
                    className="w-full py-3 rounded-xl border border-dashed border-zinc-700 hover:border-violet-500/50 bg-zinc-800/30 flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-all cursor-pointer"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach payment screenshot (UPI, etc.)
                  </button>
                )}

                {/* Pay button */}
                <Button
                  className="w-full"
                  onClick={() => handlePay(t)}
                  disabled={paying === key}
                >
                  {paying === key ? 'Sending...' : `I've paid ₹${t.amount.toLocaleString()} ✓`}
                </Button>
              </div>
            )}
          </GlowCard>
        );
      })}

      <p className="text-center text-xs text-zinc-600 mt-2">
        Attach a UPI screenshot so others can verify the payment 📎
      </p>
    </div>
  );
}
