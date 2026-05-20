import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/budget-utils';

interface BudgetMovement {
  id: string;
  created_at: string;
  movement_type: 'INGRESO' | 'EGRESO';
  amount: number;
  concept: string;
  ticket_id: string | null;
}

export function BudgetHistoryDropdown() {
  const [movements, setMovements] = useState<BudgetMovement[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || movements.length > 0) return;
    setLoading(true);
    supabaseClient
      .from('budget_movements')
      .select('id, created_at, movement_type, amount, concept, ticket_id')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMovements(data || []);
        setLoading(false);
      });
  }, [open, movements.length]);

  return (
    <div className="mt-8">
      <button
        className="px-4 py-2 bg-slate-100 rounded hover:bg-slate-200 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Ocultar historial de movimientos' : 'Ver historial de movimientos'}
      </button>
      {open && (
        <div className="mt-4 border rounded bg-white shadow-sm max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-500">Cargando...</div>
          ) : movements.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No hay movimientos registrados.</div>
          ) : (
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-1 text-left">Fecha</th>
                  <th className="px-2 py-1 text-left">Tipo</th>
                  <th className="px-2 py-1 text-left">Monto</th>
                  <th className="px-2 py-1 text-left">Concepto</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b last:border-b-0">
                    <td className="px-2 py-1">{new Date(m.created_at).toLocaleString('es-AR')}</td>
                    <td className="px-2 py-1">
                      {m.movement_type === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                    </td>
                    <td className="px-2 py-1 font-mono">
                      {formatCurrency(m.amount)}
                    </td>
                    <td className="px-2 py-1">{m.concept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
