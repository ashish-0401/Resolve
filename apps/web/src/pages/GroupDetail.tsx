import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, GroupDetail, Balance, Expense, Transfer } from '../api';
import { useAuth } from '../context/AuthContext';
import { BalancesTab } from '../components/BalancesTab';
import { ExpensesTab } from '../components/ExpensesTab';
import { GraphTab } from '../components/GraphTab';
import { SettleTab } from '../components/SettleTab';
import { AddExpenseForm } from '../components/AddExpenseForm';
import { Button } from '@/components/ui/button';
import { ProfileMenu } from '@/components/ProfileMenu';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus } from 'lucide-react';

type Tab = 'balances' | 'expenses' | 'graph' | 'settle';

const TAB_LABELS: Record<Tab, string> = {
  balances: 'Who Owes',
  expenses: 'Expenses',
  graph: 'Graph',
  settle: 'Settle Up',
};

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
    return <div className="flex items-center justify-center pt-20 text-zinc-500">Loading...</div>;
  }

  if (!group) return null;

  const members = group.members.map((m) => m.user);

  return (
    <>
      <div className="max-w-md mx-auto px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">{group.name}</h1>
              <span className="text-xs text-zinc-500">{members.length} members</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowAddExpense(true)}>
              <Plus className="h-4 w-4" /> Expense
            </Button>
            <ProfileMenu />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800/60 mb-5">
          {(['balances', 'expenses', 'graph', 'settle'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === tab
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
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
        </motion.div>
      </div>

      {showAddExpense && (
        <AddExpenseForm
          groupId={groupId}
          members={members}
          onAdded={handleExpenseAdded}
          onClose={() => setShowAddExpense(false)}
        />
      )}
    </>
  );
}
