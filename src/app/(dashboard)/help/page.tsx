"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp, LifeBuoy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Como creo un ticket nuevo?',
    answer:
      'Ingresa a Tickets y presiona Nuevo Ticket. Completa concepto, cantidad, area y prioridad sugerida. Al guardar, queda registrado para su revision.',
  },
  {
    id: 'faq-2',
    question: 'Que diferencia hay entre Aceptado y Rechazado?',
    answer:
      'Aceptado significa que el ticket puede avanzar al flujo de prioridad y presupuesto. Rechazado significa que no continua su proceso y queda cerrado.',
  },
  {
    id: 'faq-3',
    question: 'Quienes pueden modificar prioridades?',
    answer:
      'Todos pueden ver el modulo de Prioridades, pero solo Jefatura y Comision Directiva pueden reasignar, modificar o reordenar tickets por prioridad.',
  },
  {
    id: 'faq-4',
    question: 'Quienes pueden ver y editar Compras?',
    answer:
      'Compras es visible para Jefatura y Comision Directiva. Solo Comision Directiva puede gestionar tickets seleccionados y aceptar o devolverlos.',
  },
  {
    id: 'faq-5',
    question: 'Por que se cierra mi sesion automaticamente?',
    answer:
      'Por seguridad, el sistema cierra sesion tras 1 hora sin actividad. Puedes volver a iniciar sesion con tus credenciales.',
  },
  {
    id: 'faq-6',
    question: 'Donde cierro sesion manualmente?',
    answer:
      'Puedes cerrar sesion desde Configuracion, en la seccion Sesion.',
  },
];

export default function HelpPage() {
  const [openItemId, setOpenItemId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-3xl border border-white/70 bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(76,29,20,0.12)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-[#fff1e8] p-3 text-[#b42318]">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#1f120f]">Ayuda y Preguntas Frecuentes</h1>
            <p className="mt-1 text-slate-600">
              Guia rapida para entender el funcionamiento del sistema por modulos y roles.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openItemId === item.id;

            return (
              <div key={item.id} className="rounded-2xl border border-[#ead8cf] bg-[#fff9f5] p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setOpenItemId(isOpen ? null : item.id)}
                >
                  <span className="font-semibold text-[#1f120f]">{item.question}</span>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-[#7f1d1d]" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-[#7f1d1d]" />
                  )}
                </button>

                {isOpen ? <p className="mt-3 text-sm leading-6 text-slate-700">{item.answer}</p> : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}