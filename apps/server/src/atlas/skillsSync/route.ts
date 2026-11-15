// @effect-diagnostics nodeBuiltinImport:off - chemins des skills claude.ai et des zips.
// [Atlas] A25 : GET /api/atlas/skills-sync, lu par le panneau des détails de session.
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { AuthOrchestrationReadScope } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import { authenticateRawRouteWithScope } from "../../http.ts";
import { skillsSyncReport } from "./skillsSync.ts";

const home = NodeOS.homedir();
const pluginRoot = NodePath.join(
  process.env.APPDATA ?? NodePath.join(home, "AppData", "Roaming"),
  "Claude",
  "local-agent-mode-sessions",
  "skills-plugin",
);
const transferDir = NodePath.join(home, "Documents", "Claude", "00 - Skills transfer");

const reportJson = async () => JSON.stringify(await skillsSyncReport({ pluginRoot, transferDir }));

const ATLAS_SKILLS_SYNC_PATH = "/api/atlas/skills-sync";

export const layer = HttpRouter.add(
  "GET",
  ATLAS_SKILLS_SYNC_PATH,
  Effect.gen(function* () {
    yield* authenticateRawRouteWithScope(AuthOrchestrationReadScope);
    const body = yield* Effect.promise(reportJson);
    return HttpServerResponse.text(body, { contentType: "application/json" });
  }),
);
