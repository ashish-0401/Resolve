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
        <p style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</p>
        <p style={{ fontSize: '17px', fontWeight: 700 }}>Everyone's even!</p>
        <p style={{ color: 'var(--text-dim)', marginTop: '4px' }}>No one needs to pay anything.</p>
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
      {/* Clear explanation at the top */}
      <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
          To make everyone even, just do these {transfers.length} payment{transfers.length !== 1 ? 's' : ''}:
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
          No one pays extra — this is the minimum needed to settle up
        </p>
      </div>

      {/* Transfer cards - simple sentence format */}
      {transfers.map((t, i) => {
        const isCurrentUser = t.from.id === currentUserId;
        const key = `${t.from.id}-${t.to.id}`;
        const fromName = t.from.id === currentUserId ? 'You' : t.from.firstName;
        const toName = t.to.id === currentUserId ? 'you' : t.to.firstName;

        return (
          <div
            key={i}
            className="card animate-in"
            style={{
              animationDelay: `${i * 80}ms`,
              padding: '20px',
              borderColor: isCurrentUser ? 'rgba(167, 139, 250, 0.4)' : undefined,
            }}
          >
            {/* Simple sentence: "Anurag pays ₹4,475 to Ashish" */}
            <div style={{ fontSize: '16px', lineHeight: 1.6 }}>
              <strong>{fromName}</strong>
              {' pay'}{fromName === 'You' ? '' : 's'}{' '}
              <span style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '18px' }}>
                ₹{t.amount.toLocaleString()}
              </span>
              {' to '}
              <strong>{toName}</strong>
            </div>

            {/* Pay button */}
            {isCurrentUser && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px', fontSize: '14px' }}
                onClick={() => handlePay(t)}
                disabled={paying === key}
              >
                {paying === key ? 'Sending...' : `I've paid ₹${t.amount.toLocaleString()} ✓`}
              </button>
            )}
          </div>
        );
      })}

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px', lineHeight: 1.5 }}>
        After you pay someone (UPI/cash), tap the button so the group knows ✓
      </p>
    </div>
  );
}
