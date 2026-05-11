import { useState } from 'react';
import { api, User } from '../api';

interface AddExpenseFormProps {
  groupId: string;
  members: User[];
  currentUserId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddExpenseForm({ groupId, members, currentUserId, onClose, onAdded }: AddExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(currentUserId);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(members.map((m) => m.id)));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // must have at least 1
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount');
      return;
    }

    const splitMembers = Array.from(selectedMembers);
    const share = Math.round((amountNum / splitMembers.length) * 100) / 100;

    // Adjust last share to account for rounding
    const splits = splitMembers.map((userId, i) => ({
      userId,
      share: i === splitMembers.length - 1
        ? Math.round((amountNum - share * (splitMembers.length - 1)) * 100) / 100
        : share,
    }));

    setLoading(true);
    try {
      await api.createExpense(groupId, {
        description: description.trim(),
        amount: amountNum,
        paidById,
        splits,
      });
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-card-solid)',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: '480px',
          padding: '28px 20px',
          maxHeight: '85vh',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Add Expense</h2>
          <button onClick={onClose} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '14px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="label">Description</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner, Uber, groceries..."
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Amount</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="label">Paid by</label>
            <select
              className="input"
              value={paidById}
              onChange={(e) => setPaidById(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.firstName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Split with</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: '1px solid',
                    borderColor: selectedMembers.has(m.id) ? 'var(--primary)' : 'var(--border)',
                    background: selectedMembers.has(m.id) ? 'var(--primary)' : 'transparent',
                    color: selectedMembers.has(m.id) ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {selectedMembers.has(m.id) ? '✓ ' : ''}{m.firstName}
                </button>
              ))}
            </div>
            {amount && selectedMembers.size > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
                {(parseFloat(amount) / selectedMembers.size).toFixed(2)} per person
              </p>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
