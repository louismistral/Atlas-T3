// @effect-diagnostics nodeBuiltinImport:off - lit le début des transcriptions sur le disque.
// [Atlas] A8 : l'import de T3 ne regarde que les dossiers qui sont déjà des projets. On ajoute en
// projet chaque dossier où Louis a eu une session humaine (Desktop, app Codex, terminal) ces 30 jours.
// Un dossier ajouté une fois est noté : si Louis supprime le projet, il ne revient pas.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { isSkippedHead } from "./t3Born.ts";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const HEAD_BYTES = 64 * 1024;
const CWD = /"cwd":"((?:[^"\\]|\\.)*)"/;

const key = (path: string) => NodePath.resolve(path).toLowerCase();

/** Les transcriptions récentes : Claude (~/.claude/projects/x/y.jsonl) et Codex (sessions/aaaa/mm/jj/). */
function recentTranscripts(roots: ReadonlyArray<string>, nowMs: number): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    let entries: NodeFS.Dirent[];
    try {
      entries = NodeFS.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = NodePath.join(dir, entry.name);
      if (entry.isDirectory() && depth > 0) walk(path, depth - 1);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        try {
          if (nowMs - NodeFS.statSync(path).mtimeMs <= WINDOW_MS) out.push(path);
        } catch {}
      }
    }
  };
  for (const root of roots) walk(root, 3);
  return out;
}

const cwdCache = new Map<string, string | null>();

/** Le dossier de travail d'une session humaine, ou null (script, née dans T3, illisible). */
function humanCwd(file: string): string | null {
  const cached = cwdCache.get(file);
  if (cached !== undefined) return cached;
  let cwd: string | null = null;
  try {
    const fd = NodeFS.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const head = buffer
        .subarray(0, NodeFS.readSync(fd, buffer, 0, HEAD_BYTES, 0))
        .toString("utf8");
      const raw = isSkippedHead(head) ? undefined : CWD.exec(head)?.[1];
      cwd = raw === undefined ? null : (JSON.parse(`"${raw}"`) as string);
    } finally {
      NodeFS.closeSync(fd);
    }
  } catch {}
  cwdCache.set(file, cwd); // le début d'une transcription ne change plus
  return cwd;
}

/** Choisit les dossiers à ajouter en projet. Pur, pour le test. */
export function pickProjectFolders(input: {
  readonly cwds: Iterable<string>;
  readonly projectRoots: ReadonlyArray<string>;
  readonly alreadyAdded: ReadonlyArray<string>;
  readonly home: string;
  readonly tmp: string;
  readonly exists: (path: string) => boolean;
}): string[] {
  const covered = [...input.projectRoots, ...input.alreadyAdded].map(key);
  const inside = (path: string, root: string) =>
    path === root || path.startsWith(root.endsWith(NodePath.sep) ? root : root + NodePath.sep);
  const candidates = [...new Set([...input.cwds].map((cwd) => NodePath.resolve(cwd)))].filter(
    (cwd) => {
      const k = key(cwd);
      return (
        k !== key(input.home) &&
        !inside(k, key(input.tmp)) &&
        !/^tmp/i.test(NodePath.basename(cwd)) &&
        !covered.some((root) => inside(k, root)) &&
        input.exists(cwd)
      );
    },
  );
  // Un sous-dossier d'un autre candidat suit son parent.
  return candidates.filter(
    (cwd) => !candidates.some((other) => other !== cwd && inside(key(cwd), key(other))),
  );
}

export function humanSessionFolders(roots: ReadonlyArray<string>, nowMs: number): string[] {
  return recentTranscripts(roots, nowMs).flatMap((file) => humanCwd(file) ?? []);
}

export function readAdded(file: string): string[] {
  try {
    return JSON.parse(NodeFS.readFileSync(file, "utf8")) as string[];
  } catch {
    return [];
  }
}

export function writeAdded(file: string, folders: ReadonlyArray<string>): void {
  NodeFS.mkdirSync(NodePath.dirname(file), { recursive: true });
  NodeFS.writeFileSync(file, JSON.stringify(folders, null, 2));
}
