import { parentPort, workerData } from 'worker_threads';

// CONCEPT: Debt Simplification Algorithm (Worker Thread)
// This runs in a separate V8 isolate via Node.js worker_threads so it doesn't
// block the main event loop. The algorithm is CPU-bound (sorting + iteration),
// and running it on the main thread would block all other HTTP requests.
//
// Algorithm: Greedy matching
//   1. Compute net balance for each person (total paid minus total owed)
//   2. Separate into creditors (positive) and debtors (negative)
//   3. Sort both descending by amount
//   4. Pair largest creditor with largest debtor, transfer min of their amounts
//   5. Repeat until all balances are settled
//
// Result: at most n-1 transfers for n people.
// Finding the true global minimum is NP-hard (subset sum reduction).
// This greedy approach is what Splitwise uses in production.
//
// Interview: "The greedy algorithm runs in a worker thread — a separate V8 isolate
// with its own event loop — so the main thread stays responsive. It produces at most
// n-1 transfers. The true minimum is NP-hard, but greedy is what Splitwise uses too."

interface Debt {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

interface Transfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

function simplifyDebts(debts: Debt[]): Transfer[] {
  // Step 1: Compute net balance for each person
  // Positive = they are owed money (creditor)
  // Negative = they owe money (debtor)
  const balance = new Map<string, number>();

  for (const debt of debts) {
    balance.set(debt.fromUserId, (balance.get(debt.fromUserId) ?? 0) - debt.amount);
    balance.set(debt.toUserId, (balance.get(debt.toUserId) ?? 0) + debt.amount);
  }

  // Step 2: Separate into creditors and debtors
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, bal] of balance.entries()) {
    if (bal > 0.01) creditors.push({ id, amount: bal });
    if (bal < -0.01) debtors.push({ id, amount: -bal }); // store as positive
  }

  // Step 3: Sort both descending — greedy pairs the largest amounts first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Step 4: Greedy matching
  const transfers: Transfer[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.round(Math.min(creditor.amount, debtor.amount) * 100) / 100;

    transfers.push({
      fromUserId: debtor.id,
      toUserId: creditor.id,
      amount,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) creditors.shift();
    if (debtor.amount < 0.01) debtors.shift();
  }

  return transfers;
}

// Worker thread entry point — receives debts via workerData, posts result back
if (parentPort && workerData) {
  const result = simplifyDebts(workerData.debts as Debt[]);
  parentPort.postMessage(result);
}

// Also export for direct use (e.g., testing without worker threads)
export { simplifyDebts };
export type { Debt, Transfer };
