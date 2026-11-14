// @effect-diagnostics nodeBuiltinImport:off - lit le début d'une transcription sur le disque.
// [Atlas] A8 : écarte de l'import une conversation née dans T3 (sinon elle aurait un double) ou lancée
// par un script (claude -p, SDK, codex exec : des dizaines par jour, pas des conversations de Louis).
// Claude écrit son "entrypoint" (t3-code, sdk-cli, sdk-ts…) ; Codex son "originator" (T3 Code, codex_exec…).
import * as NodeFS from "node:fs";

const HEAD_BYTES = 64 * 1024;

const SKIPPED_ENTRYPOINTS = new Set(["t3-code", "sdk-cli", "sdk-ts", "sdk-py"]);
const SKIPPED_ORIGINATORS = new Set(["T3 Code", "codex_exec"]);

export function isSkippedHead(head: string): boolean {
  for (const line of head.split("\n")) {
    const entrypoint = /"entrypoint":"([^"]*)"/.exec(line)?.[1];
    if (entrypoint !== undefined) return SKIPPED_ENTRYPOINTS.has(entrypoint);
    const originator = /"originator":"([^"]*)"/.exec(line)?.[1];
    if (originator !== undefined) return SKIPPED_ORIGINATORS.has(originator);
  }
  return false;
}

export function atlasSkipsTranscript(filePath: string): boolean {
  try {
    const fd = NodeFS.openSync(filePath, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const read = NodeFS.readSync(fd, buffer, 0, HEAD_BYTES, 0);
      return isSkippedHead(buffer.subarray(0, read).toString("utf8"));
    } finally {
      NodeFS.closeSync(fd);
    }
  } catch {
    // Fichier compressé ou illisible : on laisse T3 décider comme avant.
    return false;
  }
}
