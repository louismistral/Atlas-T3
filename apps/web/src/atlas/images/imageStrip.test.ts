// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A29 : bandeau des images lues sous un tour replié.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";

it("un tour replié garde ses images en bandeau défilant", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  const logic = read("../../components/chat/MessagesTimeline.logic.ts");
  expect(logic).toContain("`turn-fold:${turnFold.runId}`");
  expect(logic).toContain("a.strip === bv.strip");
  const row = read("../../components/chat/TimelineWorkEntryRow.tsx");
  expect(row).toContain("if (row.strip)");
  expect(row).toContain("overflow-x-auto");
});
