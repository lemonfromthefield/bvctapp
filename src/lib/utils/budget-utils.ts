import { supabaseClient } from '@/lib/supabase/client';

export type BudgetTotals = {
  totalIncome: number;
  totalAssigned: number;
  totalAvailable: number;
};

type BudgetTotalsRow = {
  total_income: number | string | null;
  total_assigned: number | string | null;
  total_available: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function fetchBudgetTotals() {
  const { data, error } = await supabaseClient.rpc('get_budget_totals');

  if (error) {
    return {
      data: null,
      error,
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as BudgetTotalsRow | null;

  return {
    data: {
      totalIncome: toNumber(row?.total_income),
      totalAssigned: toNumber(row?.total_assigned),
      totalAvailable: toNumber(row?.total_available),
    } satisfies BudgetTotals,
    error: null,
  };
}