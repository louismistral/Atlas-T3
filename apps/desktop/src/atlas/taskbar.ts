// [Atlas] A21 : sans ces détails, épingler la fenêtre épingle electron.exe nu (icône Electron, lance Electron seul).
// Le lanceur « Lancer ATLAS T3.ps1 » donne son chemin dans ATLAS_T3_LANCEUR ; sans lui (T3 lancé autrement, ou hors Windows), rien.
import type * as Electron from "electron";

export function atlasTaskbarDetails(env: NodeJS.ProcessEnv): Electron.AppDetailsOptions | null {
  const launcher = env.ATLAS_T3_LANCEUR;
  const appId = env.T3CODE_DESKTOP_APP_USER_MODEL_ID;
  if (!launcher || !appId) return null;
  const powershell = `${env.WINDIR ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
  const atlasDir = launcher.replace(/[\\/][^\\/]*$/, "");
  return {
    appId,
    appIconPath: `${atlasDir}\\icone\\atlas-t3.ico`,
    appIconIndex: 0,
    relaunchCommand: `"${powershell}" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${launcher}"`,
    relaunchDisplayName: "ATLAS T3",
  };
}

export function applyAtlasTaskbar(window: Electron.BrowserWindow): void {
  const details = atlasTaskbarDetails(process.env);
  if (details) window.setAppDetails(details);
}
