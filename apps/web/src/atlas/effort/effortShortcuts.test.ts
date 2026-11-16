// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A28 : Ctrl+1 à 5 règlent l'effort.
import * as NodeFS from "node:fs";
import { DEFAULT_KEYBINDINGS } from "@t3tools/shared/keybindings";
import { expect, it } from "vite-plus/test";

it("mod+1 à 5 sont l'effort, les sauts de session gardent mod+6 à 9", () => {
  const byKey = new Map(
    DEFAULT_KEYBINDINGS.map((rule) => [`${rule.key}|${rule.when}`, rule.command]),
  );
  for (let n = 1; n <= 5; n++) {
    expect(byKey.get(`mod+${n}|!modelPickerOpen && isDesktop`)).toBe(`composer.effort.${n}`);
  }
  expect(byKey.get("mod+6|!modelPickerOpen && isDesktop")).toBe("thread.jump.6");
});

it("le composer va droit au niveau demandé", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  expect(read("../../components/chat/composerShortcuts.ts")).toContain(
    "stepReasoningEffort({ level: index + 1 })",
  );
  expect(read("../../components/chat/TraitsPicker.tsx")).toContain(
    'typeof input.direction === "object"',
  );
});
