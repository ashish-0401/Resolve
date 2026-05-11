import { useState } from 'react';
import { api, Transfer } from '../api';

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
      <div className="empty">
        <p style={{ fontSize: '48px', marginBottom: '8px' }}>✨</p>
        <p style={{ fontSize: '16px', fontWeight: 600 }}>All settled!</p>
        <p style={{ color: 'var(--text-dim)', marginTop: '4px' }}>No pending transfers.</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Optimized settlement
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} to clear all debts
        </div>
      </div>

      {/* Transfer cards */}
      {transfers.map((t, i) => {
        const isCurrentUser = t.from.id === currentUserId;
        const key = `${t.from.id}-${t.to.id}`;

        return (
          <div key={i} className="transfer-card animate-in" style={{ animationDelay: `${i * 80}ms` }}>
            {/* From user */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '56px' }}>
              <div
                className="avatar"
                style={{ background: 'var(--danger-bg)', color: 'var(--danger)', width: '40px', height: '40px', fontSize: '15px' }}
              >
                {t.from.firstName.charAt(0)}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t.from.firstName}
              </span>
            </div>

            {/* Arrow + amount */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--warning)', fontFeatureSettings: '"tnum"' }}>
                ₹{t.amount.toLocaleString()}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-dim)',
                fontSize: '18px',
              }}>
                <span>─</span>
                <span style={{ fontSize: '12px' }}>▶</span>
                <span>─</span>
              </div>
            </div>

            {/* To user */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '56px' }}>
              <div
                className="avatar"
                style={{ background: 'var(--success-bg)', color: 'var(--success)', width: '40px', height: '40px', fontSize: '15px' }}
              >
                {t.to.firstName.charAt(0)}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t.to.firstName}
              </span>
            </div>

            {/* Pay button (only if current user is the payer) */}
            {isCurrentUser && (
              <button
                className="btn btn-primary"
                style={{ width: 'auto', padding: '10px 20px', fontSize: '13px', marginLeft: '8px' }}
                onClick={() => handlePay(t)}
                disabled={paying === key}
              >
                {paying === key ? '...' : 'Pay'}
              </button>
            )}
          </div>
        );
      })}

      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>
        Computed via greedy debt simplification algorithm
      </p>
    </div>
  );
}
