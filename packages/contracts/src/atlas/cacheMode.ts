// [Atlas] A24 : que faire d'une session Claude inactive avant la fin de son cache, choisi par session
// et gardé dans un tag (commande thread.tag.set de T3). compact (défaut) : /compact 3 min avant la fin ;
// off : rien ; warm : un petit message 3 min avant la fin relance le cache pour une heure.

export type AtlasCacheMode = "compact" | "off" | "warm";

export const ATLAS_CACHE_TAG = { off: "atlas:cache-off", warm: "atlas:cache-warm" } as const;

// Le CLAUDE.md de Louis dit à Claude de répondre « cache chaud » sans rien faire d'autre.
export const ATLAS_CACHE_WARM_TEXT = "cache chaud";

/** Combien de relances automatiques d'affilée (tag atlas:warm-N), 0 sans relance. */
export function atlasWarmCount(tags: ReadonlyArray<string> | undefined): number {
  const tag = tags?.find((value) => /^atlas:warm-\d+$/.test(value));
  return tag === undefined ? 0 : Number(tag.slice("atlas:warm-".length));
}

export const atlasWarmTag = (count: number) => `atlas:warm-${count}`;

export function atlasCacheMode(tags: ReadonlyArray<string> | undefined): AtlasCacheMode {
  if (tags?.includes(ATLAS_CACHE_TAG.off)) return "off";
  if (tags?.includes(ATLAS_CACHE_TAG.warm)) return "warm";
  return "compact";
}

/** Les tags à poser ou enlever pour passer au mode choisi (un seul mode actif à la fois). */
export function atlasCacheModeChanges(
  target: AtlasCacheMode,
  tags?: ReadonlyArray<string>,
): ReadonlyArray<{ readonly tag: string; readonly tagged: boolean }> {
  const changes: Array<{ tag: string; tagged: boolean }> = [];
  for (const mode of ["off", "warm"] as const) {
    const has = tags?.includes(ATLAS_CACHE_TAG[mode]) ?? false;
    if (has !== (target === mode)) changes.push({ tag: ATLAS_CACHE_TAG[mode], tagged: !has });
  }
  const count = atlasWarmCount(tags);
  if (target !== "warm" && count > 0) changes.push({ tag: atlasWarmTag(count), tagged: false });
  return changes;
}

const LOCAL_HOUR = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23" });

/** Pas de relance « garder chaud » entre 00h et 08h (heure locale) : le cache expire, rien ne repart le matin. */
export function atlasWarmQuietHour(atMs: number): boolean {
  return Number(LOCAL_HOUR.format(atMs)) < 8;
}
