// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A4 : protège la barre du cache (calculs et raccordement au-dessus de la saisie).
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { apiCostUsd, formatCountdown, latestUsageTurn, turnTokens } from "./cacheBar.logic";

const usage = (updatedAt: string, extra: object = {}) => ({ usedTokens: 1, updatedAt, ...extra });

it("prend le tour le plus récent et ses totaux", () => {
  const turn = latestUsageTurn([
    { tokenUsage: usage("2026-11-14T10:00:00Z") },
    {
      model: "claude-opus-5-5",
      tokenUsage: usage("2026-11-14T11:00:00Z", {
        atlasTurn: {
          calls: 2,
          uncached: 10,
          read: 1_000_000,
          write5m: 0,
          write1h: 0,
          output: 1000,
        },
      }),
    },
  ]);
  expect(turn?.model).toBe("claude-opus-5-5");
  const t = turnTokens(turn!.usage);
  expect(t.read).toBe(1_000_000);
  // 1M relus × 0,20 $ + 1000 sortis × 20 $ / M + 10 × 4 $ / M
  expect(apiCostUsd("claude-opus-5-5", t)).toBeCloseTo(0.2 + 0.02 + 0.00004, 6);
  expect(apiCostUsd("gpt-6", t)).toBeNull();
});

it("sans cumul du serveur, reprend le dernier appel", () => {
  expect(
    turnTokens(usage("x", { inputTokens: 500, cachedInputTokens: 400, outputTokens: 7 }) as never),
  ).toEqual({ calls: 1, uncached: 100, read: 400, write5m: 0, write1h: 0, output: 7 });
  expect(formatCountdown(61_000)).toBe("1:01");
});

it("ChatView affiche la barre du cache", () => {
  const src = NodeFS.readFileSync(
    new URL("../../components/ChatView.tsx", import.meta.url),
    "utf8",
  );
  expect(src).toContain("<AtlasCacheBar");
});
