"use client";

import { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type ModuleFoldSectionProps = {
  title: string;
  count: number;
  status: 'pending' | 'done';
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
  emptyMessage?: string;
};

export function ModuleFoldSection({
  title,
  count,
  status,
  isOpen,
  onToggle,
  children,
  emptyMessage,
}: ModuleFoldSectionProps) {
  const hasItems = count > 0;
  const pendingStyles = hasItems
    ? 'border-[#f1b2b2] bg-[linear-gradient(180deg,#fff1f1_0%,#ffe4e4_100%)]'
    : 'border-[#b7e3c0] bg-[linear-gradient(180deg,#ecfdf1_0%,#dcfce7_100%)]';
  const pendingTextColor = hasItems ? 'text-[#8f1d1d]' : 'text-[#166534]';

  return (
    <section className={`rounded-3xl border p-4 shadow-[0_18px_40px_rgba(76,29,20,0.12)] ${status === 'pending' ? pendingStyles : 'border-white/70 bg-[var(--surface)]'}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className={`text-base font-semibold ${status === 'pending' ? pendingTextColor : 'text-[#1f120f]'}`}>{title}</p>
          {status === 'pending' ? (
            <p className={`mt-1 text-xs ${hasItems ? 'text-[#9f3a3a]' : 'text-[#2f855a]'}`}>
              {hasItems ? 'Hay nuevas acciones por realizar.' : 'No hay acciones pendientes.'}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold ${hasItems ? 'bg-[#b42318] text-white' : 'bg-[#16a34a] text-white'}`}>
            {count}
          </span>
          <span className="rounded-full border border-[#d7bfb0] bg-white/80 p-1 text-[#7d5a4f]">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="mt-4 space-y-3 border-t border-[#e9d8cf] pt-4">
          {hasItems ? children : <p className="text-sm text-[#2f855a]">{emptyMessage ?? 'Sin pendientes.'}</p>}
          <div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-xl border border-[#d7bfb0] bg-white px-3 py-1.5 text-xs font-semibold text-[#7d5a4f] transition hover:bg-[#fff3ea]"
            >
              Plegar vista
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}