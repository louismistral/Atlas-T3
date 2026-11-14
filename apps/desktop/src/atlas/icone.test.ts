// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A21 : échoue si l'icône ATLAS T3 disparaît de l'app de bureau.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";

it("l'app de bureau prend l'icône ATLAS T3", () => {
  const src = NodeFS.readFileSync(new URL("../app/DesktopAssets.ts", import.meta.url), "utf8");
  expect(src).toContain('"atlas-t3.ico"');
  expect(NodeFS.existsSync(new URL("../../../../atlas/icone/atlas-t3.ico", import.meta.url))).toBe(
    true,
  );
});
