import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createContext } from "@/server/context";
import { appRouter } from "@/server/routers/_app";

// prospect.search agora processa o ScoutAgent de forma sincrona (ver
// prospect.ts) — a busca no Overpass/Nominatim pode levar alguns segundos,
// entao estendemos o timeout padrao da funcao serverless.
export const maxDuration = 60;

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
