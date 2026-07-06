"use client";

import { useState } from "react";

import { trpc } from "@/lib/trpc/client";

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const org = trpc.settings.organization.useQuery();
  const [revealed, setRevealed] = useState(false);

  const regenerate = trpc.settings.regenerateApiKey.useMutation({
    onSuccess: () => {
      setRevealed(true);
      void utils.settings.organization.invalidate();
    },
  });
  const revoke = trpc.settings.revokeApiKey.useMutation({
    onSuccess: () => {
      setRevealed(false);
      void utils.settings.organization.invalidate();
    },
  });

  const apiKey = org.data?.apiKey ?? null;
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://prospectai-web.vercel.app";

  return (
    <div className="max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-gray-500">Dados da organização e integrações.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Organização</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400">Nome</dt>
            <dd className="text-gray-700">{org.data?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Slug</dt>
            <dd className="text-gray-700">{org.data?.slug ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">API pública (integrações)</h2>
        <p className="mt-1 text-sm text-gray-500">
          Use a chave abaixo para consumir seus prospects a partir de ferramentas externas (n8n,
          webhooks, planilhas). Somente leitura.
        </p>

        <div className="mt-4">
          <label className="text-xs text-gray-400">Chave de API</label>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-gray-100 px-3 py-2 font-mono text-sm text-gray-700">
              {apiKey ? (revealed ? apiKey : "•".repeat(32)) : "Nenhuma chave gerada"}
            </code>
            {apiKey && (
              <>
                <button
                  type="button"
                  onClick={() => setRevealed((v) => !v)}
                  className="rounded border border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  {revealed ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(apiKey)}
                  className="rounded border border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Copiar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {regenerate.isPending ? "Gerando..." : apiKey ? "Regenerar chave" : "Gerar chave"}
          </button>
          {apiKey && (
            <button
              type="button"
              onClick={() => revoke.mutate()}
              disabled={revoke.isPending}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Revogar
            </button>
          )}
        </div>

        {apiKey && (
          <div className="mt-4 rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
            <p className="mb-1 text-gray-400"># Exemplo — listar prospects com score ≥ 70</p>
            <code className="block break-all font-mono">
              curl -H &quot;Authorization: Bearer {revealed ? apiKey : "SUA_CHAVE"}&quot;{" "}
              {baseUrl}/api/v1/prospects?minScore=70&amp;limit=50
            </code>
          </div>
        )}
      </section>
    </div>
  );
}
