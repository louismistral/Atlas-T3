// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A24 : bouton du cache à 3 états, choix gardé par session.
import * as NodeFS from "node:fs";
import { ATLAS_CACHE_TAG, atlasCacheMode, atlasNextCacheMode } from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";

it("compact par défaut, puis off, garder chaud, et retour", () => {
  expect(atlasCacheMode(undefined)).toBe("compact");
  expect(atlasCacheMode([ATLAS_CACHE_TAG.off])).toBe("off");
  expect(atlasCacheMode([ATLAS_CACHE_TAG.warm])).toBe("warm");
  let tags: string[] = [];
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    for (const change of atlasNextCacheMode(atlasCacheMode(tags)).changes) {
      tags = change.tagged ? [...tags, change.tag] : tags.filter((tag) => tag !== change.tag);
    }
    seen.push(atlasCacheMode(tags));
  }
  expect(seen).toEqual(["off", "warm", "compact"]);
  expect(tags).toEqual([]);
});

it("le serveur suit le mode de la session et compacte 3 min avant", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  const service = read("../../../../server/src/orchestration-v2/IdleCompactionService.ts");
  expect(service).toContain("atlasCacheMode(thread.tags)");
  expect(service).toContain("ATLAS_CACHE_WARM_TEXT");
  expect(read("../../../../server/src/orchestration-v2/IdleCompaction.ts")).toContain(
    "const LEAD_MS = 3 * 60_000;",
  );
  expect(read("../../components/ChatView.tsx")).toContain("tags={serverProjection?.thread.tags}");
});
