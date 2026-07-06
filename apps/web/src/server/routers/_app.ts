import { router } from "../trpc";
import { campaignRouter } from "./campaign";
import { dashboardRouter } from "./dashboard";
import { interactionRouter } from "./interaction";
import { prospectRouter } from "./prospect";
import { settingsRouter } from "./settings";

export const appRouter = router({
  prospect: prospectRouter,
  campaign: campaignRouter,
  interaction: interactionRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
