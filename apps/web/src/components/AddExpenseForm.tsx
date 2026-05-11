import { useState } from 'react';
import { api, User } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AddExpenseFormProps {
  groupId: string;
  members: User[];
  onAdded: () => void;
  onClose: () => void;
}

export function AddExpenseForm({ groupId, members, onAdded, onClose }: AddExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(members[0]?.id ?? '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) { setError('Enter a valid amount'); return; }

    let splits: { userId: string; share: number }[];
    if (splitType === 'equal') {
      const share = Math.round((amtNum / members.length) * 100) / 100;
      splits = members.map((m) => ({ userId: m.id, share }));
    } else {
      splits = members.map((m) => ({ userId: m.id, share: parseFloat(customShares[m.id] || '0') }));
      const total = splits.reduce((s, x) => s + x.share, 0);
      if (Math.abs(total - amtNum) > 0.01) { setError(`Shares add to ${total}, should be ${amtNum}`); return; }
    }

    setLoading(true);
    try {
      await api.createExpense(groupId, { description, amount: amtNum, paidById, splits });
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-b-none border-b-0">
            <CardContent className="pt-5 pb-6">
              {/* Handle bar */}
              <div className="flex justify-center mb-4">
                <div className="w-9 h-1 rounded-full bg-zinc-700" />
              </div>

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Add Expense</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">What for?</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Dinner, Hotel, Fuel"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Amount (₹)</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="any"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Who paid?</label>
                  <select
                    value={paidById}
                    onChange={(e) => setPaidById(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.firstName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Split</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSplitType('equal')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        splitType === 'equal'
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType('custom')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        splitType === 'custom'
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {splitType === 'custom' && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className="text-sm text-zinc-300 w-20 truncate">{m.firstName}</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={customShares[m.id] || ''}
                          onChange={(e) => setCustomShares((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <Button type="submit" disabled={loading} className="mt-1">
                  {loading ? 'Adding...' : 'Add Expense'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
