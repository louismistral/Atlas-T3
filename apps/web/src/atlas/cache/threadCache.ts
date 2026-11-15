// [Atlas] A4 : temps de cache restant d'une session pour la barre latérale (petite projection de la barre du cache).
import type { SidebarThreadSummary } from "../../types";

const HOUR = 3_600_000;
const TEN_MINUTES = 600_000;

// shortcut: estimation locale, pas l'expiration réelle ; à remplacer si le fournisseur expose celle-ci.
export function atlasThreadCacheTtlMs(
  thread: Pick<SidebarThreadSummary, "modelSelection">,
): number {
  const id = thread.modelSelection.instanceId;
  return id.startsWith("claudeAgent")
    ? HOUR
    : id === "codex" || id.startsWith("codex_")
      ? TEN_MINUTES
      : 0;
}

export function atlasThreadCacheLeftMs(
  thread: Pick<
    SidebarThreadSummary,
    "modelSelection" | "latestRun" | "createdAt" | "latestUserMessageAt"
  >,
  now: number,
): number {
  const ttl = atlasThreadCacheTtlMs(thread);
  if (!ttl) return 0;
  const start =
    ttl === HOUR
      ? Date.parse(thread.latestRun?.completedAt ?? "")
      : Math.max(
          ...[thread.createdAt, thread.latestUserMessageAt, thread.latestRun?.completedAt].map(
            (date) => Date.parse(date ?? "") || 0,
          ),
        );
  return Number.isFinite(start) && start > 0 ? Math.max(0, Math.min(ttl, start + ttl - now)) : 0;
}
