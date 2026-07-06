"use client";

import Link from "next/link";
import { useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { toWhatsAppLink } from "@/lib/whatsapp";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  scoreBarColor,
  statusLabel,
  type ProspectStatus,
} from "@/lib/prospect-status";

const INTERACTION_TYPES = [
  { value: "NOTE", label: "Nota" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "CALL", label: "Ligação" },
  { value: "EMAIL", label: "E-mail" },
  { value: "MEETING", label: "Reunião" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "FOLLOW_UP", label: "Follow-up" },
] as const;

type InteractionType = (typeof INTERACTION_TYPES)[number]["value"];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  INTERACTION_TYPES.map((t) => [t.value, t.label])
);

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ProspectDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const utils = trpc.useUtils();

  const [type, setType] = useState<InteractionType>("NOTE");
  const [notes, setNotes] = useState("");

  const prospect = trpc.prospect.byId.useQuery({ id });
  const interactions = trpc.interaction.listByProspect.useQuery({ prospectId: id });

  const invalidate = () => {
    void utils.prospect.byId.invalidate({ id });
    void utils.interaction.listByProspect.invalidate({ prospectId: id });
  };

  const updateStatus = trpc.prospect.updateStatus.useMutation({ onSuccess: invalidate });
  const generateOutreach = trpc.prospect.generateOutreach.useMutation({ onSettled: invalidate });
  const createInteraction = trpc.interaction.create.useMutation({
    onSuccess: () => {
      setNotes("");
      setType("NOTE");
      invalidate();
    },
  });
  const deleteInteraction = trpc.interaction.delete.useMutation({ onSuccess: invalidate });

  if (prospect.isLoading) {
    return <p className="p-6 text-gray-400">Carregando...</p>;
  }

  if (!prospect.data || prospect.isError) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Prospect não encontrado.</p>
        <Link href="/prospects" className="text-sm text-indigo-600 hover:underline">
          ← Voltar
        </Link>
      </div>
    );
  }

  const p = prospect.data;
  const status = p.status as ProspectStatus;
  const whatsappLink = toWhatsAppLink(p.phone, p.outreachMessage);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/prospects" className="text-sm text-indigo-600 hover:underline">
          ← Voltar para prospecção
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{p.name}</h1>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
          >
            {statusLabel(status)}
          </span>
        </div>
        <p className="mt-1 text-gray-500">
          {[p.category?.replace(/_/g, " "), p.city, p.state].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contato */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Contato</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Telefone" value={p.phone} />
              <Field label="E-mail" value={p.email} />
              <Field label="CNPJ" value={p.cnpj} />
              <Field label="Endereço" value={p.address} />
              <LinkField label="Website" value={p.website} />
              <LinkField label="Instagram" value={p.instagramUrl} />
              <LinkField label="Facebook" value={p.facebookUrl} />
            </dl>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                {p.outreachMessage ? "Abrir WhatsApp com mensagem" : "Abrir WhatsApp"}
              </a>
            )}
          </div>

          {/* Análise comercial */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Análise comercial</h2>
              {p.score !== null && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${scoreBarColor(p.score)}`}
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800">{p.score}/100</span>
                </div>
              )}
            </div>
            {p.scoreReason && <p className="text-sm text-gray-600">{p.scoreReason}</p>}
            {p.opportunities.length > 0 && (
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-600">
                {p.opportunities.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            )}
            {p.suggestedApproach && (
              <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm italic text-gray-600">
                {p.suggestedApproach}
              </p>
            )}
            {p.score === null && (
              <p className="text-sm text-gray-400">
                Ainda não analisado. Use &quot;Analisar tudo com IA&quot; na prospecção.
              </p>
            )}
          </div>

          {/* Abordagem */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Mensagem de abordagem</h2>
              <button
                type="button"
                onClick={() =>
                  generateOutreach.mutate({ prospectId: id, channel: "whatsapp" })
                }
                disabled={generateOutreach.isPending}
                className="text-xs font-medium text-indigo-600 hover:underline disabled:text-gray-400"
              >
                {generateOutreach.isPending
                  ? "Gerando..."
                  : p.outreachMessage
                    ? "Regerar"
                    : "Gerar abordagem"}
              </button>
            </div>
            {p.outreachMessage ? (
              <p className="whitespace-pre-wrap text-sm text-gray-700">{p.outreachMessage}</p>
            ) : (
              <p className="text-sm text-gray-400">Nenhuma mensagem gerada ainda.</p>
            )}
          </div>
        </div>

        {/* Coluna lateral — status + interações */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Etapa no funil</h2>
            <select
              value={status}
              onChange={(e) =>
                updateStatus.mutate({ id, status: e.target.value as ProspectStatus })
              }
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Registrar interação</h2>
            <div className="space-y-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InteractionType)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {INTERACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações (opcional)"
                rows={3}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() =>
                  createInteraction.mutate({
                    prospectId: id,
                    type,
                    notes: notes.trim() || undefined,
                  })
                }
                disabled={createInteraction.isPending}
                className="w-full rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createInteraction.isPending ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Histórico</h2>
            {interactions.data?.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma interação registrada.</p>
            )}
            <ul className="space-y-3">
              {interactions.data?.map((it) => (
                <li key={it.id} className="border-l-2 border-indigo-200 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-700">
                      {TYPE_LABELS[it.type] ?? it.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteInteraction.mutate({ id: it.id })}
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      remover
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(it.createdAt)}</p>
                  {it.notes && <p className="mt-0.5 text-sm text-gray-600">{it.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-700">{value ?? "—"}</dd>
    </div>
  );
}

function LinkField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="truncate text-gray-700">
        {value ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            {value.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
