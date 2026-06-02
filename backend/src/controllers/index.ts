/**
 * Camada Controller — agrega routers tRPC por domínio (padrão MVC).
 */
import { router } from "../_core/trpc.js";
import { systemRouter } from "../_core/systemRouter.js";
import {
  authRouter,
  incidentsRouter,
  categoriesRouter,
  adminRouter,
  reportsRouter,
  notificationsRouter,
  analyticsRouter,
} from "./app.router.js";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  incidents: incidentsRouter,
  categories: categoriesRouter,
  admin: adminRouter,
  reports: reportsRouter,
  notifications: notificationsRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
