import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../backend/src/controllers/index";

export const trpc = createTRPCReact<AppRouter>();
