// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A4 : protège le cumul des jetons du tour et son raccordement dans l'adaptateur Claude.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { atlasClaudeTurnTokens } from "./claudeTurnTokens.ts";

it("cumule un tour : le dernier usage de chaque message compte une fois", () => {
  const turn = {};
  atlasClaudeTurnTokens(turn, "m1", {
    input_tokens: 3,
    cache_read_input_tokens: 1000,
    output_tokens: 1,
  });
  atlasClaudeTurnTokens(turn, "m1", {
    input_tokens: 3,
    cache_read_input_tokens: 1000,
    output_tokens: 50,
  });
  const result = atlasClaudeTurnTokens(turn, "m2", {
    input_tokens: 2,
    cache_read_input_tokens: 1050,
    cache_creation_input_tokens: 300,
    cache_creation: { ephemeral_1h_input_tokens: 300, ephemeral_5m_input_tokens: 0 },
    output_tokens: 20,
  });
  expect(result).toEqual({
    atlasTurn: { calls: 2, uncached: 5, read: 2050, write5m: 0, write1h: 300, output: 70 },
  });
  expect(atlasClaudeTurnTokens({}, undefined, undefined)).toEqual({});
});

it("l'adaptateur Claude et le contrat gardent le raccordement A4", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  expect(read("../orchestration-v2/Adapters/ClaudeAdapterV2.ts")).toContain(
    "atlasClaudeTurnTokens(",
  );
  expect(read("../../../../packages/contracts/src/orchestrationV2.ts")).toContain("atlasTurn:");
});
