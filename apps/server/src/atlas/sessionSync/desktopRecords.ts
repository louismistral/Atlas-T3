// @effect-diagnostics nodeBuiltinImport:off - écrit les fiches de session du Desktop.
// [Atlas] A8 : donne une fiche Desktop à une session Claude née dans T3, pour que le Desktop la liste.
// Format relevé sur le Desktop (nov. 2026) : %APPDATA%\Claude\claude-code-sessions\<compte>\<org>\local_<id>.json.
// Repris de l'ancien Atlas (src/main/desktop.ts, createRecord) : modèle = la fiche la plus récente du compte,
// nettoyée de ce qui est propre à une session. On ne modifie jamais une fiche existante.
import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const PER_SESSION =
  /^(spawn|postTurn|turnWrapUp|lastAssistant|lastTurn|latestUserFrame|lastFocused|interrupted|indexedAt|completedTurns|previousTitles|titleTurn|lineage|gitAnchors|worktree|branch|pr[A-Z]|remoteControl|steeredBy|sessionPermissionUpdates|alwaysAllowedReasons|toolSurfaceSnapshot|startedFrom|isStarred|writtenBranches|reportFindingsCard|bridgeSessionIds)/;

export interface DesktopRecordInput {
  readonly sessionsRoot: string; // %APPDATA%\Claude\claude-code-sessions
  readonly accountUuid: string;
  readonly cliSessionId: string;
  readonly cwd: string;
  readonly title: string;
  readonly createdAt: number;
  readonly now: number;
}

const fichesOf = (dir: string) =>
  NodeFS.readdirSync(dir)
    .filter((name) => /^local_.*\.json$/.test(name))
    .map((name) => NodePath.join(dir, name));

/** Le dossier d'organisation actif du compte : celui qui a le plus de fiches. */
function activeOrgDir(sessionsRoot: string, accountUuid: string): string | null {
  const accountDir = NodePath.join(sessionsRoot, accountUuid);
  if (!NodeFS.existsSync(accountDir)) return null;
  const orgs = NodeFS.readdirSync(accountDir)
    .map((name) => NodePath.join(accountDir, name))
    .filter((dir) => NodeFS.statSync(dir).isDirectory())
    .map((dir) => ({ dir, count: fichesOf(dir).length }))
    .filter((org) => org.count > 0)
    .toSorted((a, b) => b.count - a.count);
  return orgs[0]?.dir ?? null;
}

/** Les sessions Claude qui ont déjà une fiche, tous comptes confondus. */
export function knownCliSessionIds(sessionsRoot: string): Set<string> {
  const known = new Set<string>();
  if (!NodeFS.existsSync(sessionsRoot)) return known;
  for (const account of NodeFS.readdirSync(sessionsRoot)) {
    const accountDir = NodePath.join(sessionsRoot, account);
    if (!NodeFS.statSync(accountDir).isDirectory()) continue;
    for (const org of NodeFS.readdirSync(accountDir)) {
      const dir = NodePath.join(accountDir, org);
      if (!NodeFS.statSync(dir).isDirectory()) continue;
      for (const file of fichesOf(dir)) {
        const id = /"cliSessionId"\s*:\s*"([^"]+)"/.exec(NodeFS.readFileSync(file, "utf8"))?.[1];
        if (id !== undefined) known.add(id);
      }
    }
  }
  return known;
}

/** Écrit la fiche ; renvoie son chemin, ou null s'il n'y a pas de modèle pour ce compte. */
export function createDesktopRecord(input: DesktopRecordInput): string | null {
  const dir = activeOrgDir(input.sessionsRoot, input.accountUuid);
  if (dir === null) return null;
  const template = fichesOf(dir).toSorted(
    (a, b) => NodeFS.statSync(b).mtimeMs - NodeFS.statSync(a).mtimeMs,
  )[0];
  if (template === undefined) return null;
  const base = JSON.parse(NodeFS.readFileSync(template, "utf8")) as Record<string, unknown>;
  for (const key of Object.keys(base)) if (PER_SESSION.test(key)) delete base[key];
  const localId = `local_${NodeCrypto.randomUUID()}`;
  const file = NodePath.join(dir, `${localId}.json`);
  const record = {
    ...base,
    sessionId: localId,
    cliSessionId: input.cliSessionId,
    cwd: input.cwd,
    originCwd: input.cwd,
    createdAt: input.createdAt,
    lastActivityAt: input.now,
    isArchived: false,
    title: input.title,
    titleSource: "auto",
  };
  NodeFS.writeFileSync(`${file}.atlas-tmp`, JSON.stringify(record, null, 2));
  NodeFS.renameSync(`${file}.atlas-tmp`, file);
  return file;
}
