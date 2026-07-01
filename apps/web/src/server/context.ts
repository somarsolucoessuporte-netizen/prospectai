import { prisma } from "@prospectai/database";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createContext(_opts: FetchCreateContextFnOptions) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const member = user
    ? await prisma.member.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      })
    : null;

  return {
    db: prisma,
    user,
    organizationId: member?.organizationId ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
