export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <p className="mt-1 text-slate-600">Control de fondos asignados, desembolsados y comprobados.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Asignados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">$0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Desembolsados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">$0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Comprobados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">$0</p>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-[#e7d3c8] bg-[#fff9f5] p-6 text-sm text-[#6b4b42] shadow-sm">
        Este espacio puede mostrar presupuestos por ticket, estado financiero y comprobantes asociados.
      </div>
    </div>
  );
}
