// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A24 : bouton du cache à 3 états, choix gardé par session.
import * as NodeFS from "node:fs";
import {
  ATLAS_CACHE_TAG,
  atlasCacheMode,
  atlasCacheModeChanges,
  atlasWarmQuietHour,
  atlasWarmCount,
  atlasWarmTag,
} from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";

it("compact par défaut, un seul mode actif à la fois", () => {
  expect(atlasCacheMode(undefined)).toBe("compact");
  expect(atlasCacheMode([ATLAS_CACHE_TAG.off])).toBe("off");
  expect(atlasCacheMode([ATLAS_CACHE_TAG.warm])).toBe("warm");
  const apply = (tags: string[], target: "compact" | "off" | "warm") => {
    for (const change of atlasCacheModeChanges(target, tags)) {
      tags = change.tagged ? [...tags, change.tag] : tags.filter((tag) => tag !== change.tag);
    }
    return tags;
  };
  let tags = apply([], "warm");
  expect(atlasCacheMode(tags)).toBe("warm");
  tags = apply([...tags, atlasWarmTag(2)], "off");
  expect(tags).toEqual([ATLAS_CACHE_TAG.off]);
  expect(apply(tags, "compact")).toEqual([]);
  expect(atlasCacheModeChanges("compact", [])).toEqual([]);
});

it("pas de relance entre minuit et 8h", () => {
  expect(atlasWarmQuietHour(new Date(2026, 10, 16, 3, 0).getTime())).toBe(true);
  expect(atlasWarmQuietHour(new Date(2026, 10, 16, 7, 59).getTime())).toBe(true);
  expect(atlasWarmQuietHour(new Date(2026, 10, 16, 8, 0).getTime())).toBe(false);
  expect(atlasWarmQuietHour(new Date(2026, 10, 16, 23, 59).getTime())).toBe(false);
});

it("compte les relances d'affilée et les efface en quittant garder chaud", () => {
  expect(atlasWarmCount(undefined)).toBe(0);
  expect(atlasWarmCount(["x", atlasWarmTag(3)])).toBe(3);
  const changes = atlasCacheModeChanges("compact", [ATLAS_CACHE_TAG.warm, atlasWarmTag(2)]);
  expect(changes).toContainEqual({ tag: "atlas:warm-2", tagged: false });
});

it("le serveur suit le mode de la session et compacte 3 min avant", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  const service = read("../../../../server/src/orchestration-v2/IdleCompactionService.ts");
  expect(service).toContain("atlasCacheMode(thread.tags)");
  expect(service).toContain("ATLAS_CACHE_WARM_TEXT");
  expect(service).toContain('mode === "warm" ? 0 : 200_000');
  expect(service).toContain("atlasWarmTag(warmCount + 1)");
  expect(service).toContain("if (atlasWarmQuietHour(nowMs)) return;");
  expect(read("../../../../server/src/orchestration-v2/IdleCompaction.ts")).toContain(
    "const LEAD_MS = 3 * 60_000;",
  );
  expect(read("../../components/ChatView.tsx")).toContain("tags={serverProjection?.thread.tags}");
});
