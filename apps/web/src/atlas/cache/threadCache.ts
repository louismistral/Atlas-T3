// [Atlas] A4 : temps de cache restant d'une session pour la barre latérale (petite projection de la barre du cache).
import type { SidebarThreadSummary } from "../../types";

const HOUR = 3_600_000;

// shortcut: Claude seulement (instances « claudeAgent… »), cache d'1 h compté depuis la fin du dernier tour ;
// la barre au-dessus de la saisie, qui lit l'expiration réelle, fait foi. À remplacer si l'écart trompe.
export function atlasThreadCacheLeftMs(
  thread: Pick<SidebarThreadSummary, "modelSelection" | "latestRun">,
  now: number,
): number {
  if (!thread.modelSelection.instanceId.startsWith("claudeAgent")) return 0;
  const end = Date.parse(thread.latestRun?.completedAt ?? "") + HOUR;
  return Number.isFinite(end) ? Math.max(0, end - now) : 0;
}

export const ATLAS_CACHE_TTL_MS = HOUR;
