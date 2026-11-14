// [Atlas] A22 : Louis écrit en anglais et en français ; Electron ne prend que la langue du système.
import type * as Electron from "electron";

export function atlasSpellcheckLanguages(available: ReadonlyArray<string>): string[] {
  const en = available.includes("en-US") ? ["en-US"] : [];
  // Un seul français suffit : fr-FR si présent, sinon fr.
  const fr = ["fr-FR", "fr"].find((lang) => available.includes(lang));
  return fr ? [...en, fr] : en;
}

export function applyAtlasSpellcheck(window: Electron.BrowserWindow): void {
  // Sans effet sur macOS (Electron y suit la langue du système).
  const session = window.webContents.session;
  const langs = atlasSpellcheckLanguages(session.availableSpellCheckerLanguages);
  if (langs.length > 0) session.setSpellCheckerLanguages(langs);
}
