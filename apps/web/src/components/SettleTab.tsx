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
        <p style={{ fontSize: '32px' }}>🎉</p>
        <p>All settled! No pending transfers.</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
        {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} to settle all debts
      </p>

      {transfers.map((t, i) => {
        const isCurrentUser = t.from.id === currentUserId;
        const key = `${t.from.id}-${t.to.id}`;

        return (
          <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px' }}>
                <span style={{ fontWeight: 600 }}>{t.from.firstName}</span>
                <span style={{ color: 'var(--text-dim)', margin: '0 6px' }}>→</span>
                <span style={{ fontWeight: 600 }}>{t.to.firstName}</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', color: 'var(--warning)' }}>
                {t.amount.toFixed(2)}
              </div>
            </div>

            {isCurrentUser && (
              <button
                className="btn btn-primary"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
                onClick={() => handlePay(t)}
                disabled={paying === key}
              >
                {paying === key ? '...' : 'Pay'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
