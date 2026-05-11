import { Balance } from '../api';

const COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#fb923c'];

function getColor(index: number) {
  return COLORS[index % COLORS.length];
}

export function BalancesTab({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) {
    return (
      <div className="empty">
        <p style={{ fontSize: '40px', marginBottom: '8px' }}>💰</p>
        <p>No expenses yet — add one to see balances.</p>
      </div>
    );
  }

  const sorted = [...balances].sort((a, b) => b.balance - a.balance);
  const maxAbs = Math.max(...sorted.map((b) => Math.abs(b.balance)), 1);

  // Calculate total pool
  const totalPaid = sorted.reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Summary card */}
      <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Total to settle
        </div>
        <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '4px', letterSpacing: '-1px' }}>
          ₹{totalPaid.toLocaleString()}
        </div>
      </div>

      {/* Individual balances */}
      {sorted.map((b, i) => {
        const isPositive = b.balance > 0;
        const percentage = (Math.abs(b.balance) / maxAbs) * 100;
        const initial = b.user.firstName.charAt(0).toUpperCase();

        return (
          <div key={b.user.id} className="card animate-in" style={{ animationDelay: `${i * 50}ms`, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Avatar */}
              <div
                className="avatar"
                style={{ background: `${getColor(i)}20`, color: getColor(i) }}
              >
                {initial}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{b.user.firstName}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      fontFeatureSettings: '"tnum"',
                      color: isPositive ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {isPositive ? '+' : ''}₹{b.balance.toLocaleString()}
                  </span>
                </div>

                {/* Status chip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span
                    className="chip"
                    style={{
                      background: isPositive ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: isPositive ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {isPositive ? '↑ gets back' : '↓ owes'}
                  </span>
                </div>

                {/* Balance bar */}
                <div className="balance-bar" style={{ marginTop: '10px' }}>
                  <div
                    className="balance-bar-fill"
                    style={{
                      width: `${percentage}%`,
                      background: isPositive
                        ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                        : 'linear-gradient(90deg, #f87171, #ef4444)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
