// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A21 : épingler la fenêtre doit épingler le lanceur ATLAS T3, pas electron.exe.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { atlasTaskbarDetails } from "./taskbar.ts";

it("la fenêtre se relance par le lanceur avec l'icône ATLAS T3", () => {
  expect(
    atlasTaskbarDetails({
      ATLAS_T3_LANCEUR: "C:\\a b\\atlas\\Lancer ATLAS T3.ps1",
      T3CODE_DESKTOP_APP_USER_MODEL_ID: "louismistral.atlas-t3",
      WINDIR: "C:\\Windows",
    }),
  ).toEqual({
    appId: "louismistral.atlas-t3",
    appIconPath: "C:\\a b\\atlas\\icone\\atlas-t3.ico",
    appIconIndex: 0,
    relaunchCommand:
      '"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\\a b\\atlas\\Lancer ATLAS T3.ps1"',
    relaunchDisplayName: "ATLAS T3",
  });
  expect(atlasTaskbarDetails({})).toBeNull();
});

it("chaque fenêtre et le lanceur le branchent", () => {
  const win = NodeFS.readFileSync(
    new URL("../electron/ElectronWindow.ts", import.meta.url),
    "utf8",
  );
  expect(win).toContain("applyAtlasTaskbar(window)");
  const lanceur = NodeFS.readFileSync(
    new URL("../../../../atlas/Lancer ATLAS T3.ps1", import.meta.url),
    "utf8",
  );
  expect(lanceur).toContain("ATLAS_T3_LANCEUR");
});
