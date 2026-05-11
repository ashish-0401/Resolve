import { Balance } from '../api';

export function BalancesTab({ balances }: { balances: Balance[] }) {
  if (balances.length === 0) {
    return (
      <div className="empty">
        <p>No expenses yet — add one to see balances.</p>
      </div>
    );
  }

  const sorted = [...balances].sort((a, b) => b.balance - a.balance);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sorted.map((b) => (
        <div key={b.user.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{b.user.firstName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.user.email}</div>
          </div>
          <div
            style={{ fontWeight: 700, fontSize: '16px' }}
            className={b.balance > 0 ? 'positive' : b.balance < 0 ? 'negative' : ''}
          >
            {b.balance > 0 ? '+' : ''}
            {b.balance.toFixed(2)}
          </div>
        </div>
      ))}

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
        Positive = owed money · Negative = owes money
      </p>
    </div>
  );
}
