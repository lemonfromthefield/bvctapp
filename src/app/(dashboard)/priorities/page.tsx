export default function PrioritiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prioridades</h1>
        <p className="mt-1 text-slate-600">Asignación y seguimiento del orden de atención de cada solicitud.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Sin prioridad</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Alta</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Urgente</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Reordenadas</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <p className="font-semibold text-[#1f120f]">Flujo sugerido</p>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          <li>1. Revisar el ticket pendiente.</li>
          <li>2. Asignar una prioridad según urgencia e impacto.</li>
          <li>3. Registrar el cambio para trazabilidad.</li>
        </ol>
      </div>
    </div>
  );
}
