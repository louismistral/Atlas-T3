// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A32 : relevés de quota d'API et branchement du panneau.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { parseApiUsage } from "./apiUsage.ts";

const now = Date.parse("2026-11-26T12:00:00Z");
const etsy = {
  label: "Etsy Redline",
  limit: 10000,
  remaining: 9848,
  perSecond: { limit: 10, remaining: 9 },
  updatedAt: "2026-11-26T11:00:00+00:00",
};

it("lit le relevé écrit par le client Etsy", () => {
  expect(parseApiUsage(etsy, now)).toEqual({ ...etsy, stale: false });
});

it("après 24 h sans appel, le quota du jour est revenu plein", () => {
  const old = parseApiUsage({ ...etsy, updatedAt: "2026-11-25T11:00:00Z" }, now);
  expect(old?.remaining).toBe(10000);
  expect(old?.stale).toBe(true);
});

it("écarte un fichier incomplet", () => {
  expect(parseApiUsage({ ...etsy, limit: 0 }, now)).toBeNull();
  expect(parseApiUsage({ ...etsy, updatedAt: "hier" }, now)).toBeNull();
  expect(parseApiUsage({ label: "x" }, now)).toBeNull();
  expect(parseApiUsage({ ...etsy, perSecond: undefined }, now)?.perSecond).toBeNull();
});

it("la route, le bouton et le panneau sont branchés", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  expect(read("../../server.ts")).toContain("AtlasApiUsageRoute.layer");
  const web = "../../../../web/src/components/";
  expect(read(`${web}ChatView.tsx`)).toContain("<AtlasApiUsagePanel />");
  expect(read(`${web}chat/PanelLayoutControls.tsx`)).toContain("<AtlasApiUsageToggle />");
});
