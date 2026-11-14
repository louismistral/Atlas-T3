// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A22 : correcteur anglais + français.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { atlasSpellcheckLanguages } from "./spellcheck.ts";

it("choisit anglais et français parmi les langues disponibles", () => {
  expect(atlasSpellcheckLanguages(["de", "en-US", "fr-FR", "fr"])).toEqual(["en-US", "fr-FR"]);
  expect(atlasSpellcheckLanguages(["en-US", "fr"])).toEqual(["en-US", "fr"]);
  expect(atlasSpellcheckLanguages(["de"])).toEqual([]);
});

it("chaque fenêtre reçoit le correcteur", () => {
  const src = NodeFS.readFileSync(
    new URL("../electron/ElectronWindow.ts", import.meta.url),
    "utf8",
  );
  expect(src).toContain("applyAtlasSpellcheck(window)");
});
