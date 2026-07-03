"use client";

import { useEffect, useState } from "react";

import { trpc } from "@/lib/trpc/client";

const BUSINESS_SUGGESTIONS = [
  "Restaurantes",
  "Clínicas médicas",
  "Academias",
  "Salões de beleza",
  "Barbearias",
  "Dentistas",
  "Farmácias",
  "Padarias",
  "Supermercados",
  "Imobiliárias",
  "Advogados",
  "Contadores",
  "Escolas",
  "Hotéis",
  "Postos de gasolina",
  "Oficinas mecânicas",
  "Pet shops",
];

const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export function SearchForm() {
  const utils = trpc.useUtils();
  const [jobId, setJobId] = useState<string | null>(null);
  const [form, setForm] = useState({
    query: "",
    city: "",
    state: "CE",
    maxResults: 50,
  });

  const search = trpc.prospect.search.useMutation({
    onSuccess: (data) => setJobId(data.jobId),
  });

  const jobStatus = trpc.prospect.jobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "PENDING" || status === "RUNNING" ? 2000 : false;
      },
    }
  );

  // A tabela de prospects tem sua propria query (cache separado do tRPC) —
  // precisa ser invalidada explicitamente quando o job termina, senao
  // continua mostrando os dados de antes da busca.
  useEffect(() => {
    if (jobStatus.data?.status === "COMPLETED") {
      void utils.prospect.list.invalidate();
    }
  }, [jobStatus.data?.status, utils]);

  const isRunning =
    search.isPending ||
    jobStatus.data?.status === "PENDING" ||
    jobStatus.data?.status === "RUNNING";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Buscar empresas</h2>
      <p className="mb-4 text-sm text-gray-500">
        Powered by OpenStreetMap — gratuito e sem limites
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de negócio *</label>
          <input
            list="business-suggestions"
            value={form.query}
            onChange={(e) => setForm({ ...form, query: e.target.value })}
            placeholder="Ex: restaurantes, clínicas..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <datalist id="business-suggestions">
            {BUSINESS_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cidade *</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Ex: Fortaleza"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estado *</label>
          <select
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BRAZIL_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Quantidade de resultados
          </label>
          <select
            value={form.maxResults}
            onChange={(e) => setForm({ ...form, maxResults: Number(e.target.value) })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={20}>20 empresas</option>
            <option value={50}>50 empresas</option>
            <option value={100}>100 empresas</option>
          </select>
        </div>

        <button
          onClick={() => search.mutate(form)}
          disabled={isRunning || !form.query || !form.city}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Buscando..." : "Buscar empresas"}
        </button>
      </div>

      {jobId && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
          {jobStatus.data?.status === "PENDING" && (
            <>
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
              <span className="text-gray-600">Aguardando processamento...</span>
            </>
          )}
          {jobStatus.data?.status === "RUNNING" && (
            <>
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              <span className="text-gray-600">Buscando no OpenStreetMap...</span>
            </>
          )}
          {jobStatus.data?.status === "COMPLETED" && (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium text-green-700">
                Busca concluída! Prospects carregados abaixo.
              </span>
            </>
          )}
          {jobStatus.data?.status === "FAILED" && (
            <>
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-red-600">Erro: {jobStatus.data.error}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
