import { prisma } from "@prospectai/database";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ensureOrganizationId } from "./organization";

export async function createContext(_opts: FetchCreateContextFnOptions) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let organizationId: string | null = null;

  if (user) {
    try {
      organizationId = await ensureOrganizationId(user);
    } catch (error) {
      // Nao derruba a requisicao inteira por uma falha pontual de provisionamento —
      // os procedures tratam organizationId nulo de forma graciosa.
      console.error("[context] Falha ao garantir organizacao:", error);
    }
  }

  return {
    db: prisma,
    user,
    organizationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
