// @effect-diagnostics nodeBuiltinImport:off - lit le fichier source de T3.
// [Atlas] A20 : échoue si une mise à jour de T3 fait disparaître le nom ATLAS de la barre.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";

it("la barre affiche ATLAS T3", () => {
  const src = NodeFS.readFileSync(
    new URL("../components/sidebar/SidebarChrome.tsx", import.meta.url),
    "utf8",
  );
  expect(src).toContain('<span data-atlas="A20">ATLAS</span>');
});
