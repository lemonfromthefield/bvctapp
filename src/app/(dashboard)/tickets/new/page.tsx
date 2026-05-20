"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePicker } from '@/components/ui/file-picker';
import { Input } from '@/components/ui/input';
import { supabaseClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/supabase-auth';
import { createTicketSchema } from '@/lib/validators/schemas';
import { PRIORITY_RULES, TicketPriority } from '@/types/tickets';

type Area = {
  id: string;
  name: string;
  code: string;
};

export default function NewTicketPage() {
  const router = useRouter();
  const [concept, setConcept] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [areaId, setAreaId] = useState('');
  const [observations, setObservations] = useState('');
  const [suggestedPriority, setSuggestedPriority] = useState<TicketPriority>(TicketPriority.SIN_PRIORIDAD);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingAreas(true);

      const [userResult, areasResult] = await Promise.all([
        getCurrentUser(),
        supabaseClient.from('areas').select('id, name, code').order('name', { ascending: true }),
      ]);

      const { data: areasData, error: areasError } = areasResult;

      if (!userResult) {
        router.replace('/login');
        return;
      }

      if (areasError) {
        setError(areasError.message);
      } else {
        const loadedAreas = (areasData ?? []) as Area[];
        setAreas(loadedAreas);

        if (userResult.area_id) {
          setAreaId(userResult.area_id);
        } else if (loadedAreas.length > 0) {
          setAreaId(loadedAreas[0].id);
        }
      }

      setLoadingAreas(false);
    };

    loadInitialData();
  }, [router]);

  const priorityOptions = useMemo(
    () => [
      { value: TicketPriority.SIN_PRIORIDAD, label: 'Sin prioridad' },
      { value: TicketPriority.BAJA_IMPORTANCIA, label: 'Baja importancia' },
      { value: TicketPriority.MEDIA_IMPORTANCIA, label: 'Media importancia' },
      { value: TicketPriority.ALTA_IMPORTANCIA, label: 'Alta importancia' },
      { value: TicketPriority.URGENTE, label: 'Urgente' },
    ],
    []
  );

  const expectedCoverageInDays = PRIORITY_RULES[suggestedPriority].expectedCoverageInDays;

  const expectedDeadlineLabel = useMemo(() => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + expectedCoverageInDays);
    return deadline.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, [expectedCoverageInDays]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setWarning(null);

    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.replace('/login');
        return;
      }

      const parsedQuantity = Number(quantity);

      const validation = createTicketSchema.safeParse({
        concept,
        quantity: parsedQuantity,
        area_id: areaId,
        observations: observations.trim() ? observations.trim() : undefined,
        suggested_priority: suggestedPriority,
      });

      if (!validation.success) {
        setError(validation.error.issues[0]?.message ?? 'Datos inválidos para crear el ticket.');
        return;
      }

      const { data: createdTicket, error: insertError } = await supabaseClient
        .from('tickets')
        .insert({
          user_id: currentUser.id,
          area_id: validation.data.area_id,
          concept: validation.data.concept,
          quantity: validation.data.quantity,
          observations: validation.data.observations ?? null,
          suggested_priority: validation.data.suggested_priority ?? TicketPriority.SIN_PRIORIDAD,
        })
        .select('id, ticket_number')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (!createdTicket) {
        setError('No se pudo recuperar el ticket creado.');
        return;
      }

      if (selectedFiles.length > 0) {
        const uploadWarnings: string[] = [];

        for (const file of selectedFiles) {
          const sanitizedFileName = file.name.replace(/\s+/g, '_');
          const filePath = `${currentUser.id}/${createdTicket.id}/${Date.now()}-${sanitizedFileName}`;

          const { error: storageError } = await supabaseClient.storage
            .from('ticket-attachments')
            .upload(filePath, file, { upsert: false });

          if (storageError) {
            uploadWarnings.push(`No se pudo subir ${file.name}`);
            continue;
          }

          const { error: attachmentError } = await supabaseClient
            .from('attachments')
            .insert({
              ticket_id: createdTicket.id,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type || null,
              uploaded_by: currentUser.id,
            });

          if (attachmentError) {
            uploadWarnings.push(`Se subio ${file.name} pero no se registro en la base`);
          }
        }

        if (uploadWarnings.length > 0) {
          setWarning(
            `Ticket #${createdTicket.ticket_number} creado. Algunos adjuntos no se pudieron registrar: ${uploadWarnings.join(', ')}.`
          );
          return;
        }
      }

      router.push('/tickets');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1f120f]">Nuevo Ticket</h1>
          <p className="mt-1 text-slate-600">Registrá una nueva solicitud para iniciar el flujo de aprobación.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/tickets')}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario de ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Concepto"
              placeholder="Ej: Compra de mangueras de alta presión"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
              required
            />

            <Input
              label="Cantidad"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />

            <label className="space-y-1 text-sm text-slate-600">
              <span className="block font-medium text-slate-700">Área</span>
              <select
                value={areaId}
                onChange={(event) => setAreaId(event.target.value)}
                disabled={loadingAreas || areas.length === 0}
                className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm shadow-sm outline-none"
                required
              >
                {areas.length === 0 ? <option value="">Sin áreas disponibles</option> : null}
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} ({area.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="block font-medium text-slate-700">Prioridad sugerida</span>
              <select
                value={suggestedPriority}
                onChange={(event) => setSuggestedPriority(event.target.value as TicketPriority)}
                className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm shadow-sm outline-none"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-[#f3d7c6] bg-[#fff6ef] px-4 py-3 text-sm text-[#6b4b42]">
              <p className="font-semibold text-[#5f362d]">Tiempo estimado de relevamiento</p>
              <p className="mt-1">
                Para esta prioridad, el plazo objetivo es de {expectedCoverageInDays} dia{expectedCoverageInDays === 1 ? '' : 's'}.
              </p>
              <p className="mt-1 text-xs text-[#7d5a4f]">Fecha limite estimada: {expectedDeadlineLabel}</p>
            </div>

            <div className="space-y-2">
              <FilePicker
                label="Adjuntar archivos (opcional)"
                description="Podés sumar fotos, presupuestos previos o documentación de respaldo desde el inicio del pedido."
                files={selectedFiles}
                onFilesChange={setSelectedFiles}
                buttonText="Agregar archivos al ticket"
                emptyStateText="Todavía no seleccionaste archivos para este ticket."
                disabled={submitting}
              />
            </div>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="block font-medium text-slate-700">Observaciones</span>
              <textarea
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                rows={4}
                placeholder="Detalles adicionales de la solicitud"
                className="w-full rounded-xl border border-[#d9c2b7] bg-white/90 px-3 py-2 text-sm shadow-sm outline-none"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {warning ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {warning}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" isLoading={submitting}>
                Guardar ticket
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/tickets')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}