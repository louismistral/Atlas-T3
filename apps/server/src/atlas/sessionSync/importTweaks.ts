// [Atlas] A8 : réglages de l'import des sessions nées ailleurs (Desktop, app Codex, terminal).
// T3 range tout import en « Settled » (c'est pensé pour un import d'historique en une fois) ; avec la
// synchro toutes les 3 min, une session active récemment doit arriver dans la liste active.
import { EventId } from "@t3tools/contracts";

const RECENT_MS = 24 * 60 * 60 * 1000;

/** Rangée en Settled seulement si sa dernière activité date de plus de 24 h. */
export function atlasImportSettled(updatedAt: string, nowMs: number): boolean {
  const at = Date.parse(updatedAt);
  return Number.isNaN(at) || nowMs - at > RECENT_MS;
}

/**
 * Une session continuée ailleurs est réécrite avec les mêmes messages (mêmes identifiants, donc mis à
 * jour sur place) mais de nouveaux identifiants d'évènement : le journal refuse un identifiant déjà vu.
 */
export function atlasRefreshEventIds<E extends { readonly id: EventId }>(
  events: ReadonlyArray<E>,
  tag: string,
): E[] {
  return events.map((event) => ({
    ...event,
    id: EventId.make(`${event.id}:atlas-refresh:${tag}`),
  }));
}
