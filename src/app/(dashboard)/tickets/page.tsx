export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
        <p className="mt-1 text-slate-600">Central de solicitudes, seguimiento y validación operativa.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Borradores</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
          <p className="mt-1 text-sm text-slate-600">Solicitudes en edición.</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Pendientes</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
          <p className="mt-1 text-sm text-slate-600">Listas para revisión.</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#6b4b42]">Completados</p>
          <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
          <p className="mt-1 text-sm text-slate-600">Tickets cerrados y archivados.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-[#e7d3c8] bg-[#fff9f5] p-6 text-sm text-[#6b4b42] shadow-sm">
        Cuando conectes la base de datos, esta vista puede listar los tickets por estado y habilitar acciones rápidas.
      </div>
    </div>
  );
}
