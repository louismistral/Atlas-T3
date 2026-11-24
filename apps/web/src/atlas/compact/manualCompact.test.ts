// @effect-diagnostics nodeBuiltinImport:off - lit le fichier source de T3.
// [Atlas] A31 : échoue si une mise à jour de T3 fait revenir le bouton Compact / Keep de la saisie.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { atlasOfferResumeCompaction } from "./manualCompact";

it("la saisie ne propose pas de compacter avant l'envoi", () => {
  const src = NodeFS.readFileSync(
    new URL("../../components/ChatView.tsx", import.meta.url),
    "utf8",
  );
  const offer = src.slice(
    src.indexOf("const resumeCompactionTokens ="),
    src.indexOf("const [fullHistoryThreadKeys"),
  );
  expect(offer).toContain("atlasOfferResumeCompaction &&");
  expect(atlasOfferResumeCompaction).toBe(false);
});
