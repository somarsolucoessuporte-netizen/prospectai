"use client";

import Link from "next/link";

import { trpc } from "@/lib/trpc/client";
import {
  PIPELINE_ORDER,
  STATUS_COLORS,
  STATUS_LABELS,
  scoreBarColor,
} from "@/lib/prospect-status";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const stats = trpc.dashboard.stats.useQuery();

  const data = stats.data;
  const maxStatus = Math.max(1, ...(data?.byStatus.map((s) => s.count) ?? [1]));
  const maxBucket = Math.max(1, ...(data?.scoreBuckets.map((b) => b.count) ?? [1]));
  const statusMap = new Map((data?.byStatus ?? []).map((s) => [s.status, s.count]));

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Visão geral da sua base de prospects.</p>
      </div>

      {stats.isLoading && <p className="text-gray-400">Carregando métricas...</p>}

      {data && data.total === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500">Nenhum prospect ainda.</p>
          <Link href="/prospects" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">
            Iniciar uma prospecção →
          </Link>
        </div>
      )}

      {data && data.total > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total de prospects" value={data.total} />
            <StatCard label="Score médio" value={`${data.avgScore}/100`} hint={`${data.analyzed} analisados`} />
            <StatCard
              label="Com telefone"
              value={data.withPhone}
              hint={`${Math.round((data.withPhone / data.total) * 100)}% da base`}
            />
            <StatCard
              label="Com abordagem gerada"
              value={data.withOutreach}
              hint={`${data.withWebsite} com website`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Funil por status */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Prospects por status</h2>
              <div className="space-y-2">
                {PIPELINE_ORDER.filter((s) => (statusMap.get(s) ?? 0) > 0).map((status) => {
                  const count = statusMap.get(status) ?? 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-gray-500">
                        {STATUS_LABELS[status]}
                      </span>
                      <div className="h-5 flex-1 rounded bg-gray-100">
                        <div
                          className={`flex h-5 items-center justify-end rounded px-2 ${STATUS_COLORS[status]}`}
                          style={{ width: `${Math.max(6, (count / maxStatus) * 100)}%` }}
                        >
                          <span className="text-xs font-semibold">{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribuição de score */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Distribuição de score</h2>
              <div className="flex h-40 items-end justify-around gap-3">
                {data.scoreBuckets.map((bucket) => (
                  <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-gray-700">{bucket.count}</span>
                    <div
                      className={`w-full rounded-t ${scoreBarColor(bucket.max)}`}
                      style={{ height: `${Math.max(4, (bucket.count / maxBucket) * 100)}%` }}
                    />
                    <span className="text-xs text-gray-400">{bucket.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top oportunidades */}
          {data.topOpportunities.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">
                Oportunidades mais frequentes
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.topOpportunities.map((opp) => (
                  <span
                    key={opp.name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                  >
                    {opp.name}
                    <span className="rounded-full bg-indigo-200 px-1.5 text-xs font-semibold">
                      {opp.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
