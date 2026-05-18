import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Ticket, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(127,29,29,0.96)_0%,rgba(180,35,24,0.94)_55%,rgba(249,115,22,0.92)_100%)] p-8 text-white shadow-[0_24px_60px_rgba(76,29,20,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)]" />
        <div className="relative max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ffe2d2]">Bomberos Voluntarios Colonia Tirolesa</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Panel institucional de gestión</h1>
          <p className="max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            Una vista central para seguir el estado operativo, los tickets en curso y la trazabilidad general del sistema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b4b42]">Tickets Totales</p>
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
              </div>
              <div className="rounded-2xl bg-[#fff1e8] p-3 text-[#b42318]">
                <Ticket className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b4b42]">Pendientes</p>
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
              </div>
              <div className="rounded-2xl bg-[#fff4e5] p-3 text-[#f97316]">
                <AlertCircle className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b4b42]">Aceptados</p>
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">0</p>
              </div>
              <div className="rounded-2xl bg-[#ecfdf3] p-3 text-[#16a34a]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b4b42]">Presupuesto</p>
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">$0</p>
              </div>
              <div className="rounded-2xl bg-[#fce7e4] p-3 text-[#7f1d1d]">
                <TrendingUp className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">Nuevo Ticket</Button>
            <Button variant="outline">Ver Reportes</Button>
            <Button variant="outline">Mis Tickets</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[#6b4b42]">No hay actividad reciente</p>
        </CardContent>
      </Card>
    </div>
  );
}
