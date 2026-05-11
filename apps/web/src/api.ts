const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// Auth
export const api = {
  register: (body: { email: string; firstName: string; password: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Groups
  getGroups: () =>
    request<{ groups: Group[] }>('/groups'),

  getGroup: (id: string) =>
    request<{ group: GroupDetail }>(`/groups/${id}`),

  createGroup: (name: string) =>
    request<{ group: Group }>('/groups', { method: 'POST', body: JSON.stringify({ name }) }),

  addMember: (groupId: string, email: string) =>
    request<{ member: User }>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Expenses
  getExpenses: (groupId: string) =>
    request<{ expenses: Expense[] }>(`/groups/${groupId}/expenses`),

  createExpense: (groupId: string, body: CreateExpenseBody) =>
    request<{ expense: Expense }>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Balances
  getBalances: (groupId: string) =>
    request<{ balances: Balance[] }>(`/groups/${groupId}/balances`),

  // Settlement
  getSettlement: (groupId: string) =>
    request<{ transfers: Transfer[]; cached: boolean }>(`/groups/${groupId}/settlement`),

  // Payments
  createPayment: (groupId: string, toUserId: string, amount: number) =>
    request<{ payment: Payment }>(`/groups/${groupId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ toUserId, amount }),
    }),

  confirmPayment: (groupId: string, paymentId: string) =>
    request<{ payment: Payment }>(`/groups/${groupId}/payments/${paymentId}/confirm`, {
      method: 'POST',
    }),
};

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  memberCount?: number;
}

export interface GroupDetail extends Group {
  members: { userId: string; user: User }[];
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidById: string;
  createdAt: string;
  paidBy: User;
  splits: { userId: string; share: number }[];
}

export interface CreateExpenseBody {
  description: string;
  amount: number;
  paidById: string;
  splits: { userId: string; share: number }[];
}

export interface Balance {
  user: User;
  balance: number;
}

export interface Transfer {
  from: User;
  to: User;
  amount: number;
}

export interface Payment {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  confirmedAt: string | null;
  createdAt: string;
  messageId: string;
}
