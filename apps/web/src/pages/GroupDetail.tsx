import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, GroupDetail, Balance, Expense, Transfer } from '../api';
import { useAuth } from '../context/AuthContext';
import { BalancesTab } from '../components/BalancesTab';
import { ExpensesTab } from '../components/ExpensesTab';
import { GraphTab } from '../components/GraphTab';
import { SettleTab } from '../components/SettleTab';
import { AddExpenseForm } from '../components/AddExpenseForm';

type Tab = 'balances' | 'expenses' | 'graph' | 'settle';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('balances');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [loading, setLoading] = useState(true);

  const groupId = id!;

  const loadData = async () => {
    try {
      const [groupRes, balRes, expRes, settleRes] = await Promise.all([
        api.getGroup(groupId),
        api.getBalances(groupId),
        api.getExpenses(groupId),
        api.getSettlement(groupId),
      ]);
      setGroup(groupRes.group);
      setBalances(balRes.balances);
      setExpenses(expRes.expenses);
      setTransfers(settleRes.transfers);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const handleExpenseAdded = () => {
    setShowAddExpense(false);
    loadData();
  };

  if (loading) {
    return <div className="spinner" style={{ paddingTop: '80px' }}>Loading...</div>;
  }

  if (!group) return null;

  const members = group.members.map((m) => m.user);

  return (
    <>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', color: 'var(--text-muted)', fontSize: '18px', padding: '4px' }}
          >
            ←
          </button>
          <h1 style={{ fontSize: '18px' }}>{group.name}</h1>
        </div>
        <button
          className="btn btn-primary"
          style={{ width: 'auto', padding: '8px 14px', fontSize: '13px' }}
          onClick={() => setShowAddExpense(true)}
        >
          + Expense
        </button>
      </div>

      <div className="container" style={{ paddingTop: 0 }}>
        <div className="tabs">
          {(['balances', 'expenses', 'graph', 'settle'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'balances' ? '💰' : tab === 'expenses' ? '📋' : tab === 'graph' ? '🕸️' : '✅'}
              {' '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'balances' && <BalancesTab balances={balances} />}
        {activeTab === 'expenses' && <ExpensesTab expenses={expenses} members={members} />}
        {activeTab === 'graph' && <GraphTab balances={balances} transfers={transfers} />}
        {activeTab === 'settle' && (
          <SettleTab
            transfers={transfers}
            groupId={groupId}
            currentUserId={user!.id}
            onPayment={loadData}
          />
        )}
      </div>

      {showAddExpense && (
        <AddExpenseForm
          groupId={groupId}
          members={members}
          currentUserId={user!.id}
          onClose={() => setShowAddExpense(false)}
          onAdded={handleExpenseAdded}
        />
      )}
    </>
  );
}
