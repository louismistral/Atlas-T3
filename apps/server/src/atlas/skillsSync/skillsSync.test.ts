// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A25 : règles de synchronisation des skills claude.ai.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { sameFiles, zipStatus } from "./skillsSync.ts";

it("suit les règles du CLAUDE.md : importé, à importer, divergence", () => {
  expect(zipStatus({ sameContent: true, updatedAt: 200, zipTime: 100 })).toBe("imported");
  expect(zipStatus({ sameContent: false, updatedAt: 200, zipTime: 100 })).toBe("diverged");
  expect(zipStatus({ sameContent: true, updatedAt: 50, zipTime: 100 })).toBe("pending");
  expect(zipStatus({ sameContent: false, updatedAt: undefined, zipTime: 100 })).toBe("unknown");
});

it("compare les fichiers sans tenir compte des fins de ligne", () => {
  const a = new Map([["SKILL.md", "a\r\nb"]]);
  expect(sameFiles(a, new Map([["SKILL.md", "a\nb"]]))).toBe(true);
  expect(sameFiles(a, new Map([["SKILL.md", "a\nc"]]))).toBe(false);
  expect(
    sameFiles(
      a,
      new Map([
        ["SKILL.md", "a\nb"],
        ["x.md", ""],
      ]),
    ),
  ).toBe(false);
});

it("la route et le panneau sont branchés", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  expect(read("../../server.ts")).toContain("AtlasSkillsSyncRoute.layer");
  expect(read("../../../../web/src/components/chat/ThreadDetailsPanel.tsx")).toContain(
    "<AtlasSkillsSync />",
  );
});
