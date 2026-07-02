import { router } from "../trpc";
import { campaignRouter } from "./campaign";
import { prospectRouter } from "./prospect";

export const appRouter = router({
  prospect: prospectRouter,
  campaign: campaignRouter,
});

export type AppRouter = typeof appRouter;
