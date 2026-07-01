import { Agent, type AgentContext, type AgentResult } from "../base/Agent";
import { resolveOsmTags, type OsmTag } from "./osm-categories";

export interface ScoutPayload {
  query: string; // Ex: "restaurantes"
  city: string; // Ex: "Fortaleza"
  state: string; // Ex: "CE"
  country?: string; // Default: "Brazil"
  maxResults?: number; // Default: 50
}

export interface RawProspect {
  name: string;
  osmId: string;
  osmType: "node" | "way" | "relation";
  address: string | null;
  city: string;
  state: string;
  country: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  category: string | null;
  openingHours: string | null;
  rawData: Record<string, unknown>;
}

export interface ScoutResult {
  source: "openstreetmap";
  query: string;
  location: string;
  totalFound: number;
  prospects: RawProspect[];
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

interface NominatimResult {
  boundingbox: [string, string, string, string];
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "ProspectAI/0.1 (https://somar.ia.br)";

/**
 * ScoutAgent — Encontra empresas via OpenStreetMap + Overpass API.
 *
 * Gratuito, sem chave de API, sem cartao de credito.
 * Cobertura excelente do Brasil.
 *
 * Responsabilidade unica: buscar e retornar prospects brutos.
 * Nao analisa, nao enriquece, nao contata.
 */
export class ScoutAgent extends Agent<ScoutPayload, ScoutResult> {
  readonly name = "scout";
  readonly description = "Encontra empresas via OpenStreetMap (Overpass API)";

  private readonly overpassUrl: string;

  constructor(overpassUrl = "https://overpass-api.de/api/interpreter") {
    super();
    this.overpassUrl = overpassUrl;
  }

  async execute(payload: ScoutPayload, context: AgentContext): Promise<AgentResult<ScoutResult>> {
    const { query, city, state, country = "Brazil", maxResults = 50 } = payload;

    const locationStr = `${city}, ${state}, ${country}`;
    this.log(`Buscando: "${query}" em ${locationStr}`);

    try {
      const bbox = await this.geocodeLocation(city, state, country);
      const osmTags = resolveOsmTags(query);
      const overpassQuery = this.buildOverpassQuery(osmTags, query, bbox, maxResults);

      this.log("Executando query Overpass...");

      const response = await fetch(this.overpassUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "*/*",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as OverpassResponse;
      const elements = data.elements ?? [];

      this.log(`Elementos retornados: ${elements.length}`);

      const prospects: RawProspect[] = [];

      for (const element of elements) {
        if (prospects.length >= maxResults) break;

        const tags = element.tags ?? {};
        const name = tags.name;

        if (!name) continue;

        const lat = element.lat ?? element.center?.lat ?? null;
        const lng = element.lon ?? element.center?.lon ?? null;
        const address = this.buildAddress(tags, city, state);

        prospects.push({
          name,
          osmId: `${element.type}/${element.id}`,
          osmType: element.type,
          address,
          city: tags["addr:city"] ?? city,
          state: tags["addr:state"] ?? state,
          country,
          lat,
          lng,
          phone: tags.phone ?? tags["contact:phone"] ?? null,
          website: tags.website ?? tags["contact:website"] ?? null,
          email: tags.email ?? tags["contact:email"] ?? null,
          category:
            tags.amenity ?? tags.shop ?? tags.leisure ?? tags.office ?? tags.tourism ?? null,
          openingHours: tags.opening_hours ?? null,
          rawData: { ...tags, osmId: element.id, osmType: element.type },
        });
      }

      this.log(`Prospects validos: ${prospects.length}`);

      return {
        success: true,
        data: {
          source: "openstreetmap",
          query,
          location: locationStr,
          totalFound: prospects.length,
          prospects,
        },
        metadata: {
          jobId: context.jobId,
          executedAt: new Date().toISOString(),
          overpassElements: elements.length,
        },
      };
    } catch (error) {
      this.logError("Falha na busca", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }

  /**
   * Geocodifica cidade/estado/pais para uma bounding box via Nominatim.
   *
   * O Overpass QL nao aceita filtrar uma area por dois valores de nome
   * simultaneamente (ex.: cidade + estado) em um unico filtro `~`, e
   * depender so do nome da cidade gera ambiguidade entre municipios
   * homonimos de estados diferentes. Resolver a bounding box via Nominatim
   * primeiro evita esse problema e é mais robusto.
   */
  private async geocodeLocation(
    city: string,
    state: string,
    country: string
  ): Promise<BoundingBox> {
    const q = `${city}, ${state}, ${country}`;
    const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q)}&limit=1`;

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status} ${response.statusText}`);
    }

    const results = (await response.json()) as NominatimResult[];
    const first = results[0];

    if (!first) {
      throw new Error(`Localizacao nao encontrada: ${q}`);
    }

    const [south, north, west, east] = first.boundingbox.map(Number) as [
      number,
      number,
      number,
      number,
    ];

    return { south, north, west, east };
  }

  private buildOverpassQuery(
    osmTags: OsmTag[] | null,
    query: string,
    bbox: BoundingBox,
    maxResults: number
  ): string {
    const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

    if (osmTags && osmTags.length > 0) {
      const tagFilters = osmTags.map((t) => `["${t.key}"="${t.value}"]`).join("");

      return `
[out:json][timeout:25];
(
  node${tagFilters}(${bboxStr});
  way${tagFilters}(${bboxStr});
);
out center ${maxResults};
      `.trim();
    }

    const escapedQuery = this.escapeOverpassString(query);

    return `
[out:json][timeout:25];
(
  node["name"~"${escapedQuery}",i](${bboxStr});
  way["name"~"${escapedQuery}",i](${bboxStr});
);
out center ${maxResults};
    `.trim();
  }

  private escapeOverpassString(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  private buildAddress(tags: Record<string, string>, city: string, state: string): string | null {
    const parts: string[] = [];

    const street = tags["addr:street"];
    if (street) {
      const housenumber = tags["addr:housenumber"];
      parts.push(housenumber ? `${street}, ${housenumber}` : street);
    }

    const neighbourhood = tags["addr:neighbourhood"];
    if (neighbourhood) parts.push(neighbourhood);

    const addressCity = tags["addr:city"] ?? city;
    const addressState = tags["addr:state"] ?? state;

    if (addressCity) parts.push(addressCity);
    if (addressState) parts.push(addressState);

    const postcode = tags["addr:postcode"];
    if (postcode) parts.push(postcode);

    return parts.length > 0 ? parts.join(", ") : null;
  }
}
