import { router } from "../trpc";
import { authRouter } from "./auth";
import { campaignRouter } from "./campaign";
import { prospectRouter } from "./prospect";

export const appRouter = router({
  auth: authRouter,
  prospect: prospectRouter,
  campaign: campaignRouter,
});

export type AppRouter = typeof appRouter;
