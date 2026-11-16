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

/** Le mode suivant du bouton, et les tags à poser ou enlever pour y passer. */
export function atlasNextCacheMode(
  mode: AtlasCacheMode,
  tags?: ReadonlyArray<string>,
): {
  readonly next: AtlasCacheMode;
  readonly changes: ReadonlyArray<{ readonly tag: string; readonly tagged: boolean }>;
} {
  switch (mode) {
    case "compact":
      return { next: "off", changes: [{ tag: ATLAS_CACHE_TAG.off, tagged: true }] };
    case "off":
      return {
        next: "warm",
        changes: [
          { tag: ATLAS_CACHE_TAG.off, tagged: false },
          { tag: ATLAS_CACHE_TAG.warm, tagged: true },
        ],
      };
    case "warm":
      return {
        next: "compact",
        changes: [
          { tag: ATLAS_CACHE_TAG.warm, tagged: false },
          ...(atlasWarmCount(tags) > 0
            ? [{ tag: atlasWarmTag(atlasWarmCount(tags)), tagged: false }]
            : []),
        ],
      };
  }
}
