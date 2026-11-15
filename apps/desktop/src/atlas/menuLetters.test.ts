// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A26 : lettres des menus clic droit.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { menuLetters, withMnemonic } from "./menuLetters.ts";

it("donne une lettre distincte par entrée, l'initiale d'un mot d'abord", () => {
  expect(
    menuLetters(["Pin thread", "Settle thread", "Snooze", "Rename thread", "Regenerate title"]),
  ).toEqual(["P", "S", "N", "R", "T"]);
});

it("souligne la lettre et garde les & d'origine", () => {
  expect(withMnemonic("Snooze", "N")).toBe("S&nooze");
  expect(withMnemonic("Regenerate title", "T")).toBe("Regenerate &title");
  expect(withMnemonic("Copy & paste", "P")).toBe("Copy && &paste");
  expect(withMnemonic("Custom…", null)).toBe("Custom…");
});

it("le menu natif reçoit les lettres", () => {
  const src = NodeFS.readFileSync(new URL("../electron/ElectronMenu.ts", import.meta.url), "utf8");
  expect(src).toContain("withMnemonic(item.label");
});
