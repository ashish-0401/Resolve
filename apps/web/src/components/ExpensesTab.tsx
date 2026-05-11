import { Expense, User } from '../api';

const COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#fb923c'];

export function ExpensesTab({ expenses, members }: { expenses: Expense[]; members: User[] }) {
  if (expenses.length === 0) {
    return (
      <div className="empty">
        <p style={{ fontSize: '40px', marginBottom: '8px' }}>📋</p>
        <p>No expenses yet.</p>
      </div>
    );
  }

  const memberMap = new Map(members.map((m, i) => [m.id, { ...m, color: COLORS[i % COLORS.length] }]));
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Total */}
      <div className="card" style={{ textAlign: 'center', padding: '16px 20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Total expenses
        </div>
        <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', letterSpacing: '-1px' }}>
          ₹{total.toLocaleString()}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Expense list */}
      {expenses.map((exp, i) => {
        const payer = memberMap.get(exp.paidById);
        const payerColor = payer?.color ?? '#a78bfa';

        return (
          <div key={exp.id} className="card animate-in" style={{ animationDelay: `${i * 40}ms`, padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              {/* Payer avatar */}
              <div
                className="avatar"
                style={{ background: `${payerColor}20`, color: payerColor, marginTop: '2px' }}
              >
                {exp.paidBy.firstName.charAt(0)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{exp.description}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {exp.paidBy.firstName} paid · {new Date(exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px', fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>
                    ₹{exp.amount.toLocaleString()}
                  </div>
                </div>

                {/* Split chips */}
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {exp.splits.map((s) => {
                    const member = memberMap.get(s.userId);
                    return (
                      <span
                        key={s.userId}
                        className="chip"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {member?.firstName ?? '?'}: ₹{s.share.toLocaleString()}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
