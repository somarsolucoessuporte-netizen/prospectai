"use client";

import type { Route } from "next";
import Link from "next/link";

import { trpc } from "@/lib/trpc/client";
import { toWhatsAppLink } from "@/lib/whatsapp";
import {
  PIPELINE_ORDER,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  scoreBarColor,
  type ProspectStatus,
} from "@/lib/prospect-status";

export default function CrmPage() {
  const utils = trpc.useUtils();
  const pipeline = trpc.prospect.pipeline.useQuery(undefined);

  const updateStatus = trpc.prospect.updateStatus.useMutation({
    onSuccess: () => {
      void utils.prospect.pipeline.invalidate();
      void utils.dashboard.stats.invalidate();
    },
  });

  const prospects = pipeline.data ?? [];
  const byStatus = new Map<ProspectStatus, typeof prospects>();
  for (const status of PIPELINE_ORDER) byStatus.set(status, []);
  for (const p of prospects) {
    const key = (PIPELINE_ORDER.includes(p.status as ProspectStatus)
      ? p.status
      : "NEW") as ProspectStatus;
    byStatus.get(key)?.push(p);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM — Pipeline</h1>
        <p className="mt-1 text-gray-500">
          Acompanhe cada prospect pelo funil comercial. Mova entre etapas pelo seletor de cada card.
        </p>
      </div>

      {pipeline.isLoading && <p className="text-gray-400">Carregando pipeline...</p>}

      {!pipeline.isLoading && prospects.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500">Nenhum prospect na base.</p>
          <Link
            href="/prospects"
            className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            Iniciar uma prospecção →
          </Link>
        </div>
      )}

      {prospects.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_ORDER.map((status) => {
            const column = byStatus.get(status) ?? [];
            return (
              <div key={status} className="flex w-72 shrink-0 flex-col rounded-xl bg-gray-100 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs font-medium text-gray-400">{column.length}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {column.map((p) => {
                    const whatsappLink = toWhatsAppLink(p.phone, p.outreachMessage);
                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <Link
                          href={`/prospects/${p.id}` as Route}
                          className="block text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {[p.category?.replace(/_/g, " "), p.city].filter(Boolean).join(" · ") ||
                            "—"}
                        </p>

                        {p.score !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                              <div
                                className={`h-1.5 rounded-full ${scoreBarColor(p.score)}`}
                                style={{ width: `${p.score}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-700">{p.score}</span>
                          </div>
                        )}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <select
                            value={status}
                            onChange={(e) =>
                              updateStatus.mutate({
                                id: p.id,
                                status: e.target.value as ProspectStatus,
                              })
                            }
                            className="rounded border border-gray-300 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          {whatsappLink && (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-green-600 hover:underline"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {column.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">Vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
