import { prisma } from "@prospectai/database";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createContext(_opts: FetchCreateContextFnOptions) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    db: prisma,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
