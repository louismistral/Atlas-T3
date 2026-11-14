// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A3 : échoue si les quotas disparaissent du bas de la barre.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";

it("le pied de la barre affiche les quotas", () => {
  const src = NodeFS.readFileSync(
    new URL("../../components/sidebar/SidebarChrome.tsx", import.meta.url),
    "utf8",
  );
  expect(src).toContain("<AtlasQuotaFooter />");
});

it("le détail de la session compte les quotas utilisés, pas restants", () => {
  const src = NodeFS.readFileSync(
    new URL("../../components/chat/ThreadDetailsUsage.tsx", import.meta.url),
    "utf8",
  );
  expect(src).toContain("const used = 100 - remainingPercent(window);");
});
