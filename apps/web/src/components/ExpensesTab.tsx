import { Expense, User } from '../api';

export function ExpensesTab({ expenses, members }: { expenses: Expense[]; members: User[] }) {
  if (expenses.length === 0) {
    return (
      <div className="empty">
        <p>No expenses yet.</p>
      </div>
    );
  }

  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {expenses.map((exp) => (
        <div key={exp.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{exp.description}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Paid by {exp.paidBy.firstName} · {new Date(exp.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>
              {exp.amount.toFixed(2)}
            </div>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {exp.splits.map((s) => {
              const name = memberMap.get(s.userId)?.firstName ?? 'Unknown';
              return (
                <span
                  key={s.userId}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {name}: {s.share.toFixed(2)}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
