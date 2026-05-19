"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, AlertCircle, CheckCircle2, Layers, Wallet } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase/client';
import { fetchBudgetTotals, formatCurrency } from '@/lib/utils/budget-utils';

type DashboardMetrics = {
  totalTickets: number;
  pendingTickets: number;
  acceptedTickets: number;
  acceptedInPriorities: number;
  availableFunds: number;
  totalDisbursed: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTickets: 0,
    pendingTickets: 0,
    acceptedTickets: 0,
    acceptedInPriorities: 0,
    availableFunds: 0,
    totalDisbursed: 0,
  });

  useEffect(() => {
    const loadMetrics = async () => {
      const [totalResult, pendingResult, acceptedResult, acceptedInPrioritiesResult, budgetTotalsResult] = await Promise.all([
        supabaseClient.from('tickets').select('id', { count: 'exact', head: true }),
        supabaseClient
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['BORRADOR', 'PENDIENTE', 'EN_PROCESO', 'PRESUPUESTADO']),
        supabaseClient
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACEPTADO'),
        supabaseClient
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'ACEPTADO')
          .neq('assigned_priority', 'SIN_PRIORIDAD'),
        fetchBudgetTotals(),
      ]);

      setMetrics({
        totalTickets: totalResult.count ?? 0,
        pendingTickets: pendingResult.count ?? 0,
        acceptedTickets: acceptedResult.count ?? 0,
        acceptedInPriorities: acceptedInPrioritiesResult.count ?? 0,
        availableFunds: budgetTotalsResult.data?.totalAvailable ?? 0,
        totalDisbursed: budgetTotalsResult.data?.totalAssigned ?? 0,
      });
    };

    loadMetrics();
  }, []);

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b4b42]">Tickets Totales</p>
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">{metrics.totalTickets}</p>
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
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">{metrics.pendingTickets}</p>
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
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">{metrics.acceptedTickets}</p>
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
                <p className="mt-2 text-3xl font-bold text-[#1f120f]">{metrics.acceptedInPriorities}</p>
                <p className="mt-1 text-xs text-slate-500">Aceptados con prioridad asignada</p>
              </div>
              <div className="rounded-2xl bg-[#fce7e4] p-3 text-[#7f1d1d]">
                <Layers className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b4b42]">Fondos Disponibles</p>
                <p className="mt-2 text-2xl font-bold text-[#1f120f]">{formatCurrency(metrics.availableFunds)}</p>
              </div>
              <div className="rounded-2xl bg-[#ecfdf3] p-3 text-[#15803d]">
                <Wallet className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#6b4b42]">Total Desembolsado</p>
                <p className="mt-2 text-2xl font-bold text-[#1f120f]">{formatCurrency(metrics.totalDisbursed)}</p>
              </div>
              <div className="rounded-2xl bg-[#fff4e5] p-3 text-[#c2410c]">
                <Layers className="h-7 w-7" />
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
            <Button variant="default" onClick={() => router.push('/tickets/new')}>
              Nuevo Ticket
            </Button>
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
