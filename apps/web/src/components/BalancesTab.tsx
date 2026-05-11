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
        <p>No expenses yet — add one to get started!</p>
      </div>
    );
  }

  const sorted = [...balances].sort((a, b) => b.balance - a.balance);
  const maxAbs = Math.max(...sorted.map((b) => Math.abs(b.balance)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Simple explanation */}
      <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Based on all expenses so far, here's where everyone stands
        </p>
      </div>

      {/* Individual balances */}
      {sorted.map((b, i) => {
        const isPositive = b.balance > 0;
        const percentage = (Math.abs(b.balance) / maxAbs) * 100;
        const initial = b.user.firstName.charAt(0).toUpperCase();

        // Simple, clear message
        const statusText = isPositive
          ? `Others owe them ₹${b.balance.toLocaleString()}`
          : b.balance < 0
            ? `Needs to pay ₹${Math.abs(b.balance).toLocaleString()}`
            : 'All square! 🎉';

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
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>{b.user.firstName}</span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '17px',
                      fontFeatureSettings: '"tnum"',
                      color: isPositive ? 'var(--success)' : b.balance < 0 ? 'var(--danger)' : 'var(--text-muted)',
                    }}
                  >
                    {isPositive ? '+' : ''}₹{b.balance.toLocaleString()}
                  </span>
                </div>

                {/* Clear status message */}
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {statusText}
                </p>

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

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px', padding: '0 16px' }}>
        💡 Go to the <strong>Settle</strong> tab to see exactly who pays whom to make everyone even
      </p>
    </div>
  );
}
