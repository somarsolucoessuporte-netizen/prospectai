"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  ENRICHED: "Enriquecido",
  ANALYZED: "Analisado",
  CONTACTED: "Contatado",
  NEGOTIATING: "Negociando",
  CONVERTED: "Convertido",
  LOST: "Perdido",
  DISQUALIFIED: "Desqualificado",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-700",
  ENRICHED: "bg-blue-100 text-blue-700",
  ANALYZED: "bg-purple-100 text-purple-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  NEGOTIATING: "bg-orange-100 text-orange-700",
  CONVERTED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  DISQUALIFIED: "bg-gray-100 text-gray-500",
};

export function ProspectTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.prospect.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Prospects</h2>
          <p className="text-sm text-gray-500">{data?.total ?? 0} empresas encontradas</p>
        </div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome, cidade..."
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left font-medium text-gray-500">Empresa</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Categoria</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Cidade</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Contato</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Score</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && data?.prospects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Nenhum prospect encontrado. Use o formulário acima para buscar empresas.
                </td>
              </tr>
            )}
            {data?.prospects.map((prospect) => (
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
                  {prospect.score !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-indigo-600"
                          style={{ width: `${prospect.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{prospect.score}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Pendente</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[prospect.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {STATUS_LABELS[prospect.status] ?? prospect.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <span className="text-sm text-gray-500">
            Página {page} de {data.pages}
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
              disabled={page === data.pages}
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
