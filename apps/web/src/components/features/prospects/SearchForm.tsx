"use client";

import { useEffect, useState } from "react";

import { BRAZIL_CITIES_BY_STATE } from "@/lib/brazil-cities";
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

const BRAZIL_STATES = Object.keys(BRAZIL_CITIES_BY_STATE).sort();

export function SearchForm() {
  const utils = trpc.useUtils();
  const [jobId, setJobId] = useState<string | null>(null);
  const [form, setForm] = useState({
    query: "",
    city: BRAZIL_CITIES_BY_STATE.CE?.[0] ?? "",
    state: "CE",
    maxResults: 50,
  });
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

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

  // A tabela de prospects tem suas proprias queries (cache separado do tRPC) —
  // precisam ser invalidadas explicitamente quando o job termina, senao
  // continuam mostrando os dados de antes da busca.
  useEffect(() => {
    if (jobStatus.data?.status === "COMPLETED") {
      void utils.prospect.sessions.invalidate();
      void utils.prospect.bySession.invalidate();
    }
  }, [jobStatus.data?.status, utils]);

  const progressMessages = [
    "Conectando ao OpenStreetMap...",
    `Buscando ${form.query || "empresas"} em ${form.city}...`,
    "Processando resultados...",
    "Salvando no banco de dados...",
    "Quase pronto...",
  ];

  // Barra de progresso simulada: nao ha atualizacoes incrementais reais do
  // servidor (a busca roda de forma sincrona), entao ela sobe gradualmente
  // ate 90% enquanto a mutation esta pendente e salta pra 100% ao terminar.
  useEffect(() => {
    if (search.isPending) {
      setProgress(8);
      setMessageIndex(0);

      const progressTimer = setInterval(() => {
        setProgress((p) => (p < 90 ? Math.min(90, p + 6) : p));
      }, 400);

      const messageTimer = setInterval(() => {
        setMessageIndex((i) => (i + 1) % progressMessages.length);
      }, 3000);

      return () => {
        clearInterval(progressTimer);
        clearInterval(messageTimer);
      };
    }

    setProgress((p) => (p > 0 ? 100 : 0));
    const resetTimer = setTimeout(() => setProgress(0), 800);
    return () => clearTimeout(resetTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.isPending]);

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
          <select
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(BRAZIL_CITIES_BY_STATE[form.state] ?? []).map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Estado *</label>
          <select
            value={form.state}
            onChange={(e) => {
              const newState = e.target.value;
              const firstCity = BRAZIL_CITIES_BY_STATE[newState]?.[0] ?? "";
              setForm({ ...form, state: newState, city: firstCity });
            }}
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
          onClick={() => {
            // Limpa o job anterior primeiro, senao o status "Busca concluída"
            // da busca passada continua visivel enquanto a nova roda.
            setJobId(null);
            search.mutate(form);
          }}
          disabled={isRunning || !form.query || !form.city}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Buscando..." : "Buscar empresas"}
        </button>
      </div>

      {(search.isPending || progress > 0) && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>{progressMessages[messageIndex]}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

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
              <button
                type="button"
                onClick={() => setJobId(null)}
                className="ml-auto text-xs font-medium text-indigo-600 hover:underline"
              >
                Nova busca
              </button>
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
