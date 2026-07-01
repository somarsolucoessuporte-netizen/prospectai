import { prisma, type Prisma, type Prospect } from "@prospectai/database";

import type { RawProspect } from "../scout/ScoutAgent";

export interface PersistResult {
  created: number;
  skipped: number;
  prospects: Prospect[];
}

/**
 * Persiste prospects brutos no banco, evitando duplicatas por nome + cidade.
 *
 * OSM nao oferece um identificador estavel equivalente ao googlePlaceId em
 * todos os elementos, entao a deduplicacao usa nome + cidade como heuristica
 * para o MVP.
 */
export class ProspectPersistenceService {
  async persistMany(organizationId: string, rawProspects: RawProspect[]): Promise<PersistResult> {
    const results: Prospect[] = [];
    let created = 0;
    let skipped = 0;

    for (const raw of rawProspects) {
      try {
        const existing = await prisma.prospect.findFirst({
          where: {
            organizationId,
            name: raw.name,
            city: raw.city,
          },
        });

        if (existing) {
          skipped++;
          results.push(existing);
          continue;
        }

        const prospect = await prisma.prospect.create({
          data: {
            organizationId,
            name: raw.name,
            address: raw.address,
            city: raw.city,
            state: raw.state,
            country: raw.country,
            lat: raw.lat,
            lng: raw.lng,
            phone: raw.phone,
            website: raw.website,
            email: raw.email,
            category: raw.category,
            sources: ["openstreetmap"],
            rawData: raw.rawData as Prisma.InputJsonValue,
            status: "NEW",
          },
        });

        results.push(prospect);
        created++;
      } catch (error) {
        console.error(`Erro ao persistir prospect ${raw.name}:`, error);
        skipped++;
      }
    }

    return { created, skipped, prospects: results };
  }
}
