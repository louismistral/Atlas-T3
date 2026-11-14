// @effect-diagnostics nodeBuiltinImport:off - lit les transcriptions et la correspondance des comptes.
// [Atlas] A8 : sessions partagées avec le Desktop et l'app ChatGPT/Codex, sans les états.
// Toutes les 3 minutes :
//  1. ce qui est né ailleurs (Desktop, app Codex, terminal) entre dans T3 par l'import de T3 lui-même,
//     pour chaque projet de T3 (les sessions nées dans T3 sont écartées, voir t3Born.ts) ;
//  2. chaque session Claude née dans T3 reçoit une fiche Desktop, si son compte est dans
//     ~/.claude/atlas/desktop-comptes.json ({ "<instance T3>": "<uuid du compte Desktop>" }).
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import * as SqlClient from "effect/sql/SqlClient";

import * as AgentSessionImporter from "../../project/AgentSessionImporter.ts";
import * as AgentSessionScanner from "../../project/AgentSessionScanner.ts";
import * as ProjectService from "../../project/ProjectService.ts";
import { createDesktopRecord, knownCliSessionIds } from "./desktopRecords.ts";

const home = NodeOS.homedir();
const desktopSessionsRoot = NodePath.join(
  process.env.APPDATA ?? NodePath.join(home, "AppData", "Roaming"),
  "Claude",
  "claude-code-sessions",
);
const accountsFile = NodePath.join(home, ".claude", "atlas", "desktop-comptes.json");
const claudeProjects = NodePath.join(home, ".claude", "projects");

function readAccounts(): Record<string, string> {
  try {
    return JSON.parse(NodeFS.readFileSync(accountsFile, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

/** La transcription d'une session Claude et son dossier de travail (premier "cwd" écrit). */
function findTranscript(sessionId: string): { cwd: string } | null {
  if (!NodeFS.existsSync(claudeProjects)) return null;
  for (const dir of NodeFS.readdirSync(claudeProjects)) {
    const file = NodePath.join(claudeProjects, dir, `${sessionId}.jsonl`);
    if (!NodeFS.existsSync(file)) continue;
    const head = NodeFS.readFileSync(file, "utf8").slice(0, 256 * 1024);
    const cwd = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(head)?.[1];
    return cwd === undefined ? null : { cwd: JSON.parse(`"${cwd}"`) as string };
  }
  return null;
}

export const layer = Layer.effectDiscard(
  Effect.gen(function* () {
    const scanner = yield* AgentSessionScanner.AgentSessionScanner;
    const importer = yield* AgentSessionImporter.AgentSessionImporter;
    const projects = yield* ProjectService.ProjectService;
    const sql = yield* SqlClient.SqlClient;

    const importFromOutside = Effect.gen(function* () {
      yield* scanner.scan; // relit les dossiers : sans lui, l'import garde la liste du démarrage
      const snapshot = yield* projects.snapshot;
      for (const project of snapshot.projects) {
        if (project.archivedAt) continue;
        yield* importer.importRecentAgentThreads({ projectId: project.id }).pipe(Effect.ignore);
      }
    });

    const exportToDesktop = Effect.gen(function* () {
      const accounts = readAccounts();
      if (Object.keys(accounts).length === 0) return;
      const rows = yield* sql<{
        readonly title: string;
        readonly createdAt: string;
        readonly instance: string | null;
        readonly nativeId: string | null;
      }>`
        SELECT t.title AS title, t.created_at AS createdAt, pt.provider_instance_id AS instance,
          json_extract(pt.payload_json, '$.nativeThreadRef.nativeId') AS nativeId
        FROM orchestration_v2_projection_provider_threads pt
        JOIN orchestration_v2_projection_threads t ON t.thread_id = pt.thread_id
        WHERE pt.driver = 'claudeAgent' AND instr(pt.thread_id, ':') = 0
          AND t.deleted_at IS NULL AND t.archived_at IS NULL
      `;
      const now = yield* Clock.currentTimeMillis;
      const known = knownCliSessionIds(desktopSessionsRoot);
      for (const row of rows) {
        if (row.nativeId === null || known.has(row.nativeId)) continue;
        const accountUuid = row.instance === null ? undefined : accounts[row.instance];
        if (accountUuid === undefined) continue;
        const transcript = findTranscript(row.nativeId);
        if (transcript === null) continue; // pas encore de conversation écrite
        createDesktopRecord({
          sessionsRoot: desktopSessionsRoot,
          accountUuid,
          cliSessionId: row.nativeId,
          cwd: transcript.cwd,
          title: row.title,
          createdAt: Date.parse(row.createdAt) || now,
          now,
        });
        known.add(row.nativeId);
      }
    });

    const syncOnce = Effect.all([importFromOutside, exportToDesktop], { discard: true }).pipe(
      Effect.catchCause((cause) => Effect.logWarning("atlas session sync failed", { cause })),
    );
    yield* syncOnce.pipe(
      Effect.delay("30 seconds"),
      Effect.repeat(Schedule.spaced("3 minutes")),
      Effect.forkScoped,
    );
  }),
);
