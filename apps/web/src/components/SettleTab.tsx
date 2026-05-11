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

      {/* Transfer cards */}
      {transfers.map((t, i) => {
        const isCurrentUser = t.from.id === currentUserId;
        const key = `${t.from.id}-${t.to.id}`;

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
            {/* "You need to pay" badge if it's the current user */}
            {isCurrentUser && (
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--primary)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                👆 You need to pay this
              </div>
            )}

            {/* Transfer visual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* From */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '56px' }}>
                <div
                  className="avatar"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)', width: '44px', height: '44px', fontSize: '16px' }}
                >
                  {t.from.firstName.charAt(0)}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  {t.from.id === currentUserId ? 'You' : t.from.firstName}
                </span>
              </div>

              {/* Arrow + amount */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '2px' }}>pays</div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--warning)',
                  fontFeatureSettings: '"tnum"',
                }}>
                  ₹{t.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: '16px', color: 'var(--text-dim)', marginTop: '2px' }}>→</div>
              </div>

              {/* To */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '56px' }}>
                <div
                  className="avatar"
                  style={{ background: 'var(--success-bg)', color: 'var(--success)', width: '44px', height: '44px', fontSize: '16px' }}
                >
                  {t.to.firstName.charAt(0)}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>
                  {t.to.id === currentUserId ? 'You' : t.to.firstName}
                </span>
              </div>
            </div>

            {/* Pay button */}
            {isCurrentUser && (
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px', fontSize: '14px' }}
                onClick={() => handlePay(t)}
                disabled={paying === key}
              >
                {paying === key ? 'Sending...' : `Mark as Paid — ₹${t.amount.toLocaleString()}`}
              </button>
            )}
          </div>
        );
      })}

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px', lineHeight: 1.5 }}>
        Once paid, tap "Mark as Paid" so the group knows it's done ✓
      </p>
    </div>
  );
}
