export type ProspectStatus =
  | "NEW"
  | "ENRICHED"
  | "ANALYZED"
  | "CONTACTED"
  | "NEGOTIATING"
  | "CONVERTED"
  | "LOST"
  | "DISQUALIFIED";

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: "Novo",
  ENRICHED: "Enriquecido",
  ANALYZED: "Analisado",
  CONTACTED: "Contatado",
  NEGOTIATING: "Negociando",
  CONVERTED: "Convertido",
  LOST: "Perdido",
  DISQUALIFIED: "Desqualificado",
};

export const STATUS_COLORS: Record<ProspectStatus, string> = {
  NEW: "bg-gray-100 text-gray-700",
  ENRICHED: "bg-blue-100 text-blue-700",
  ANALYZED: "bg-purple-100 text-purple-700",
  CONTACTED: "bg-yellow-100 text-yellow-700",
  NEGOTIATING: "bg-orange-100 text-orange-700",
  CONVERTED: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  DISQUALIFIED: "bg-gray-100 text-gray-500",
};

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as ProspectStatus[];

/** Ordem das colunas no quadro de pipeline (CRM). */
export const PIPELINE_ORDER: ProspectStatus[] = [
  "NEW",
  "ENRICHED",
  "ANALYZED",
  "CONTACTED",
  "NEGOTIATING",
  "CONVERTED",
  "LOST",
  "DISQUALIFIED",
];

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as ProspectStatus] ?? status;
}

/** Cor da barra de score por faixa de potencial comercial. */
export function scoreBarColor(score: number): string {
  if (score <= 30) return "bg-red-500";
  if (score <= 60) return "bg-yellow-500";
  if (score <= 80) return "bg-green-400";
  return "bg-green-600";
}
