// @effect-diagnostics nodeBuiltinImport:off - lit les relevés de quota écrits par les scripts de Louis.
// [Atlas] A32 : quotas d'API externes (Etsy Redline, Etsy File Drawer). Chaque client écrit un fichier
// `~/.claude/atlas/api-usage/<nom>.json` après chaque réponse : { label, limit, remaining, perSecond?, updatedAt }.
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";

export interface ApiUsage {
  readonly label: string;
  readonly limit: number;
  readonly remaining: number;
  readonly perSecond: { readonly limit: number; readonly remaining: number } | null;
  readonly updatedAt: string;
  /** Plus de 24 h sans appel : le quota du jour est forcément revenu plein. */
  readonly stale: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function parseApiUsage(raw: unknown, now: number): ApiUsage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { label, limit, remaining, perSecond, updatedAt } = raw as Record<string, unknown>;
  if (typeof label !== "string" || !isCount(limit) || limit === 0 || !isCount(remaining))
    return null;
  if (typeof updatedAt !== "string") return null;
  const at = Date.parse(updatedAt);
  if (Number.isNaN(at)) return null;
  const second = perSecond as Record<string, unknown> | null | undefined;
  const stale = now - at > DAY_MS;
  return {
    label,
    limit,
    remaining: stale ? limit : Math.min(remaining, limit),
    perSecond:
      second && isCount(second.limit) && second.limit > 0 && isCount(second.remaining)
        ? { limit: second.limit, remaining: second.remaining }
        : null,
    updatedAt,
    stale,
  };
}

export async function readApiUsage(dir: string, now: number): Promise<ReadonlyArray<ApiUsage>> {
  const names = await NodeFSP.readdir(dir).catch(() => [] as string[]);
  const entries = await Promise.all(
    names
      .filter((name) => name.endsWith(".json"))
      .toSorted()
      .map((name) =>
        NodeFSP.readFile(NodePath.join(dir, name), "utf8")
          .then((text) => parseApiUsage(JSON.parse(text), now))
          .catch(() => null),
      ),
  );
  return entries.filter((entry) => entry !== null);
}
