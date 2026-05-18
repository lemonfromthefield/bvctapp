export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-slate-600">Resumen general del estado operativo del sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Tickets activos</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Prioridad alta</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Presupuesto total</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">$0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Usuarios pendientes</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <p className="font-semibold text-[#1f120f]">Próximo paso</p>
        <p className="mt-2 text-sm text-slate-700">
          Cuando conectes consultas reales, este panel puede consolidar métricas de tickets, presupuesto y usuarios.
        </p>
      </div>
    </div>
  );
}
