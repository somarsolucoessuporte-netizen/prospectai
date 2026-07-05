"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { toWhatsAppLink } from "@/lib/whatsapp";
import { trpc } from "@/lib/trpc/client";

type ProspectStatus =
  | "NEW"
  | "ENRICHED"
  | "ANALYZED"
  | "CONTACTED"
  | "NEGOTIATING"
  | "CONVERTED"
  | "LOST"
  | "DISQUALIFIED";

const STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: "Novo",
  ENRICHED: "Enriquecido",
  ANALYZED: "Analisado",
  CONTACTED: "Contatado",
  NEGOTIATING: "Negociando",
  CONVERTED: "Convertido",
  LOST: "Perdido",
  DISQUALIFIED: "Desqualificado",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
  NEW: "bg-gray-100 text-gray-700",
  ENRICHED: "bg-blue-100 text-blue-700",
  ANALYZED: "bg-purple-100 text-purple-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  NEGOTIATING: "bg-orange-100 text-orange-700",
  CONVERTED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  DISQUALIFIED: "bg-gray-100 text-gray-500",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as ProspectStatus[];

/** Cor da barra de score por faixa de potencial comercial. */
function scoreBarColor(score: number): string {
  if (score <= 30) return "bg-red-500";
  if (score <= 60) return "bg-yellow-500";
  if (score <= 80) return "bg-green-400";
  return "bg-green-600";
}

function sanitizeForFilename(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/[^a-zA-Z0-9]+/g, "") || "busca"
  );
}

export function ProspectTable() {
  const utils = trpc.useUtils();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const sessions = trpc.prospect.sessions.useQuery();

  // Sempre que a sessao mais recente mudar (ex.: uma nova busca terminou),
  // seleciona a aba mais recente automaticamente — mas nao interfere se o
  // usuario tiver clicado manualmente em uma aba mais antiga.
  useEffect(() => {
    const mostRecentId = sessions.data?.[0]?.id ?? null;
    if (mostRecentId && mostRecentId !== selectedSessionId) {
      setSelectedSessionId(mostRecentId);
      setPage(1);
    }
  }, [sessions.data, selectedSessionId]);

  const list = trpc.prospect.bySession.useQuery(
    { sessionId: selectedSessionId ?? "", page, limit: 100 },
    { enabled: !!selectedSessionId }
  );

  const deleteSession = trpc.prospect.deleteSession.useMutation({
    onSuccess: (_result, variables) => {
      void utils.prospect.sessions.invalidate();
      if (variables.sessionId === selectedSessionId) {
        setSelectedSessionId(null);
      }
    },
  });

  const updateStatus = trpc.prospect.updateStatus.useMutation({
    onSuccess: () => {
      if (selectedSessionId) {
        void utils.prospect.bySession.invalidate({ sessionId: selectedSessionId });
      }
    },
  });

  const deleteProspect = trpc.prospect.delete.useMutation({
    onSuccess: () => {
      void utils.prospect.sessions.invalidate();
      if (selectedSessionId) {
        void utils.prospect.bySession.invalidate({ sessionId: selectedSessionId });
      }
    },
  });

  const enrichAll = trpc.prospect.enrichAll.useMutation({
    onSuccess: () => {
      if (selectedSessionId) {
        void utils.prospect.bySession.invalidate({ sessionId: selectedSessionId });
      }
      void utils.prospect.sessions.invalidate();
    },
  });

  const selectedSession = sessions.data?.find((s) => s.id === selectedSessionId);

  const handleExport = () => {
    if (!list.data?.prospects.length || !selectedSession) return;

    const rows = list.data.prospects.map((p) => ({
      Nome: p.name,
      Categoria: p.category ?? "",
      Cidade: p.city ?? "",
      Telefone: p.phone ?? "",
      Website: p.website ?? "",
      WhatsApp: toWhatsAppLink(p.phone) ?? "",
      Score: p.score ?? "",
      Status: STATUS_LABELS[p.status as ProspectStatus] ?? p.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prospects");

    const year = new Date().getFullYear();
    const filename = `ProspectAI_${sanitizeForFilename(selectedSession.query)}_${sanitizeForFilename(selectedSession.city)}_${year}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Abas de sessoes de busca */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 px-4 pt-3">
        {sessions.data?.length === 0 && (
          <p className="px-2 py-2 text-sm text-gray-400">
            Nenhuma busca realizada ainda. Use o formulário acima para começar.
          </p>
        )}
        {sessions.data?.map((session) => (
          <div
            key={session.id}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm transition-colors ${
              session.id === selectedSessionId
                ? "border-indigo-600 font-medium text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedSessionId(session.id);
                setPage(1);
              }}
              className="whitespace-nowrap"
            >
              {session.query} - {session.city} ({session.count})
            </button>
            <button
              type="button"
              aria-label={`Excluir busca ${session.query} em ${session.city}`}
              onClick={() => {
                if (
                  window.confirm(
                    `Excluir a busca "${session.query} - ${session.city}" e seus prospects?`
                  )
                ) {
                  deleteSession.mutate({ sessionId: session.id });
                }
              }}
              className="text-gray-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Header da aba selecionada */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedSession ? `${selectedSession.query} — ${selectedSession.city}` : "Prospects"}
          </h2>
          <p className="text-sm text-gray-500">
            {list.data?.total ?? 0} empresa{list.data?.total === 1 ? "" : "s"} nesta busca
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectedSessionId) {
                enrichAll.mutate({ sessionId: selectedSessionId });
              }
            }}
            disabled={!list.data?.prospects.length || enrichAll.isPending}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enrichAll.isPending ? "Analisando..." : "Analisar tudo com IA"}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!list.data?.prospects.length}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar Excel
          </button>
        </div>
      </div>
      {enrichAll.isSuccess && (
        <div className="border-b border-indigo-100 bg-indigo-50 px-6 py-2 text-xs text-indigo-700">
          {enrichAll.data.queued} prospect(s) na fila de análise — {enrichAll.data.processed}{" "}
          processado(s) nesta rodada. Clique novamente para continuar processando os restantes.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left font-medium text-gray-500">Empresa</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Categoria</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Cidade</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Contato</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">WhatsApp</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Score</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!selectedSessionId && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  Selecione ou inicie uma busca para ver os prospects.
                </td>
              </tr>
            )}
            {selectedSessionId && list.isLoading && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {selectedSessionId && !list.isLoading && list.data?.prospects.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  Nenhum prospect encontrado nesta busca.
                </td>
              </tr>
            )}
            {list.data?.prospects.map((prospect) => {
              const whatsappLink = toWhatsAppLink(prospect.phone);
              const status = prospect.status as ProspectStatus;

              return (
                <tr key={prospect.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{prospect.name}</div>
                    {prospect.website && (
                      <a
                        href={prospect.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {prospect.website.replace(/^https?:\/\//, "").slice(0, 40)}
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 capitalize text-gray-500">
                    {prospect.category?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {prospect.city && prospect.state ? `${prospect.city}, ${prospect.state}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {prospect.phone ? (
                      <div className="text-xs">{prospect.phone}</div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {whatsappLink ? (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
                      >
                        Abrir WhatsApp
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {prospect.score !== null ? (
                      <div
                        className="flex items-center gap-2"
                        title={prospect.scoreReason ?? undefined}
                      >
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full ${scoreBarColor(prospect.score)}`}
                            style={{ width: `${prospect.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-800">{prospect.score}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Pendente</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[status] ?? prospect.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={status}
                        onChange={(e) =>
                          updateStatus.mutate({
                            id: prospect.id,
                            status: e.target.value as ProspectStatus,
                          })
                        }
                        className="rounded border border-gray-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deletar "${prospect.name}"?`)) {
                            deleteProspect.mutate({ id: prospect.id });
                          }
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Deletar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {list.data && list.data.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <span className="text-sm text-gray-500">
            Página {page} de {list.data.pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === list.data.pages}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
