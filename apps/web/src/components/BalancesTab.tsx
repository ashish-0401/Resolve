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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Individual balances */}
      {sorted.map((b, i) => {
        const isPositive = b.balance > 0;
        const initial = b.user.firstName.charAt(0).toUpperCase();

        return (
          <div key={b.user.id} className="card animate-in" style={{ animationDelay: `${i * 50}ms`, padding: '18px 20px' }}>
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
                <div style={{ fontWeight: 700, fontSize: '16px' }}>{b.user.firstName}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {isPositive
                    ? <span>Paid <strong style={{ color: 'var(--success)' }}>₹{b.balance.toLocaleString()} extra</strong> — others need to pay them back</span>
                    : b.balance < 0
                      ? <span>Owes <strong style={{ color: 'var(--danger)' }}>₹{Math.abs(b.balance).toLocaleString()}</strong> to the group</span>
                      : <span style={{ color: 'var(--success)' }}>All even! ✓</span>
                  }
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px', padding: '0 16px' }}>
        💡 Tap <strong>Settle Up</strong> to see exactly who pays whom
      </p>
    </div>
  );
}
