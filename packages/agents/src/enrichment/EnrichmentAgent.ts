import { prisma, type Prisma } from "@prospectai/database";

import { Agent, type AgentContext, type AgentResult } from "../base/Agent";

export interface EnrichmentPayload {
  prospectId: string;
  website: string;
}

export interface EnrichmentResult {
  prospectId: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
}

const USER_AGENT = "Mozilla/5.0 (compatible; ProspectAI/1.0; +https://somar.ia.br)";

/**
 * EnrichmentAgent — Extrai dados de contato do website da empresa.
 *
 * Busca telefone, WhatsApp, email e redes sociais diretamente no HTML do
 * site. Gratuito, sem API externa. Nunca sobrescreve um campo existente com
 * vazio: so persiste o que encontrar.
 *
 * Responsabilidade unica: enriquecer contato a partir do website.
 */
export class EnrichmentAgent extends Agent<EnrichmentPayload, EnrichmentResult> {
  readonly name = "enrichment";
  readonly description = "Extrai dados de contato do website da empresa";

  async execute(
    payload: EnrichmentPayload,
    context: AgentContext
  ): Promise<AgentResult<EnrichmentResult>> {
    const { prospectId, website } = payload;

    this.log(`Enriquecendo website: ${website}`);

    try {
      const url = website.startsWith("http") ? website : `https://${website}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return { success: true, data: this.emptyResult(prospectId) };
      }

      const html = await response.text();

      const result: EnrichmentResult = {
        prospectId,
        phone: this.extractPhone(html),
        whatsapp: this.extractWhatsApp(html),
        email: this.extractEmail(html),
        instagram: this.extractInstagram(html),
        facebook: this.extractFacebook(html),
      };

      const data: Prisma.ProspectUpdateInput = { enrichedAt: new Date() };
      const phone = result.phone ?? result.whatsapp;
      if (phone) data.phone = phone;
      if (result.email) data.email = result.email;
      if (result.instagram) data.instagramUrl = result.instagram;
      if (result.facebook) data.facebookUrl = result.facebook;

      await prisma.prospect.update({ where: { id: prospectId }, data });

      this.log(
        `Extraido — phone: ${result.phone ?? "-"}, whatsapp: ${result.whatsapp ?? "-"}, email: ${
          result.email ?? "-"
        }`
      );

      return {
        success: true,
        data: result,
        metadata: { jobId: context.jobId, executedAt: new Date().toISOString() },
      };
    } catch (error) {
      this.logError("Falha no enriquecimento", error);
      return { success: true, data: this.emptyResult(prospectId) };
    }
  }

  private extractPhone(html: string): string | null {
    const patterns = [
      /href="tel:([^"]+)"/i,
      /\+55\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/,
      /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(html);
      const raw = match?.[1] ?? match?.[0];
      if (raw) {
        const phone = raw.trim();
        const digits = phone.replace(/\D/g, "");
        if (digits.length >= 10) return phone;
      }
    }

    return null;
  }

  private extractWhatsApp(html: string): string | null {
    const patterns = [
      /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?([0-9+]+)/i,
      /whatsapp[^0-9]{0,10}(\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4})/i,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        const digits = match[1].replace(/\D/g, "");
        if (digits.length >= 10) {
          return `+${digits.startsWith("55") ? digits : `55${digits}`}`;
        }
      }
    }

    return null;
  }

  private extractEmail(html: string): string | null {
    const pattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(pattern);

    if (!matches) return null;

    const blacklist = [
      "@sentry",
      "@example",
      "@test",
      "@email",
      "noreply",
      "no-reply",
      "wordpress",
      "jquery",
      ".png",
      ".jpg",
      ".gif",
      ".svg",
    ];

    const valid = matches.find(
      (email) => !blacklist.some((b) => email.toLowerCase().includes(b))
    );

    return valid ?? null;
  }

  private extractInstagram(html: string): string | null {
    const match = /instagram\.com\/([a-zA-Z0-9_.]+)/.exec(html);
    const handle = match?.[1];
    if (!handle) return null;
    if (["p", "explore", "reel", "reels"].includes(handle)) return null;
    return `https://instagram.com/${handle}`;
  }

  private extractFacebook(html: string): string | null {
    const match = /facebook\.com\/([a-zA-Z0-9_.]+)/.exec(html);
    const page = match?.[1];
    if (!page) return null;
    if (["sharer", "share", "dialog", "plugins", "tr"].includes(page)) return null;
    return `https://facebook.com/${page}`;
  }

  private emptyResult(prospectId: string): EnrichmentResult {
    return {
      prospectId,
      phone: null,
      whatsapp: null,
      email: null,
      instagram: null,
      facebook: null,
    };
  }
}
