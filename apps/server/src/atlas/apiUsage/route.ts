// @effect-diagnostics nodeBuiltinImport:off - dossier des relevés de quota.
// [Atlas] A32 : GET /api/atlas/api-usage, lu par le panneau des quotas d'API en bas à droite.
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { AuthOrchestrationReadScope } from "@t3tools/contracts";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import { authenticateRawRouteWithScope } from "../../http.ts";
import { readApiUsage } from "./apiUsage.ts";

const usageDir = NodePath.join(NodeOS.homedir(), ".claude", "atlas", "api-usage");
const reportJson = async (now: number) => JSON.stringify(await readApiUsage(usageDir, now));

export const layer = HttpRouter.add(
  "GET",
  "/api/atlas/api-usage",
  Effect.gen(function* () {
    yield* authenticateRawRouteWithScope(AuthOrchestrationReadScope);
    const now = yield* Clock.currentTimeMillis;
    const body = yield* Effect.promise(() => reportJson(now));
    return HttpServerResponse.text(body, { contentType: "application/json" });
  }),
);
