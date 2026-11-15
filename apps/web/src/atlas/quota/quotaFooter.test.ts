// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A3 : échoue si les quotas disparaissent du bas de la barre.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";

import { weekElapsed, weekPace } from "./weekPace";

it("la semaine part du vendredi 00:00 et l'écart suit le rythme linéaire", () => {
  const friday = new Date(2026, 10, 13, 0, 0).getTime(); // vendredi 13 nov. 2026
  expect(weekElapsed(friday)).toBe(0);
  expect(weekElapsed(friday + 3.5 * 86_400_000)).toBeCloseTo(0.5);
  expect(weekElapsed(friday - 60_000)).toBeCloseTo(1, 3); // jeudi 23:59 → fin de semaine
  const pace = weekPace([60, 50, 40], friday + 3.5 * 86_400_000);
  expect(pace).toMatchObject({ total: 150, max: 300, delta: 0 });
});

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
