// @effect-diagnostics nodeBuiltinImport:off - fichiers temporaires et sources de T3.
// [Atlas] A8 : protège le partage des sessions (filtre de l'import, fiches Desktop, raccordements).
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { expect, it } from "vite-plus/test";
import { createDesktopRecord, knownCliSessionIds } from "./desktopRecords.ts";
import { isSkippedHead } from "./t3Born.ts";

it("écarte les sessions nées dans T3 et celles des scripts, garde le Desktop et le terminal", () => {
  expect(isSkippedHead('{"type":"user","entrypoint":"t3-code"}')).toBe(true);
  expect(isSkippedHead('{"entrypoint":"sdk-cli"}')).toBe(true);
  expect(isSkippedHead('{"payload":{"originator":"codex_exec"}}')).toBe(true);
  expect(isSkippedHead('{"payload":{"originator":"T3 Code"}}')).toBe(true);
  expect(isSkippedHead('{"entrypoint":"claude-desktop"}')).toBe(false);
  expect(isSkippedHead('{"entrypoint":"cli"}')).toBe(false);
  expect(isSkippedHead('{"payload":{"originator":"Codex Desktop"}}')).toBe(false);
});

it("crée une fiche Desktop d'après la plus récente du compte, sans toucher aux autres", () => {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "atlas-a8-"));
  const org = NodePath.join(root, "acct", "org");
  NodeFS.mkdirSync(org, { recursive: true });
  const model = NodePath.join(org, "local_old.json");
  NodeFS.writeFileSync(
    model,
    JSON.stringify({ cliSessionId: "old", model: "opus", isStarred: true, gitAnchors: [1] }),
  );
  const file = createDesktopRecord({
    sessionsRoot: root,
    accountUuid: "acct",
    cliSessionId: "new",
    cwd: "C:\p",
    title: "Titre",
    createdAt: 1,
    now: 2,
  });
  const record = JSON.parse(NodeFS.readFileSync(file!, "utf8"));
  expect(record).toMatchObject({ cliSessionId: "new", cwd: "C:\p", title: "Titre", model: "opus" });
  expect(record.isStarred).toBeUndefined();
  expect(record.gitAnchors).toBeUndefined();
  expect(JSON.parse(NodeFS.readFileSync(model, "utf8")).cliSessionId).toBe("old");
  expect([...knownCliSessionIds(root)].toSorted()).toEqual(["new", "old"]);
  expect(
    createDesktopRecord({
      sessionsRoot: root,
      accountUuid: "absent",
      cliSessionId: "x",
      cwd: "",
      title: "",
      createdAt: 1,
      now: 2,
    }),
  ).toBeNull();
  NodeFS.rmSync(root, { recursive: true, force: true });
});

it("le serveur et l'import gardent les raccordements A8", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  expect(read("../../server.ts")).toContain("AtlasSessionSync.layer");
  expect(read("../../project/AgentSessionImporter.ts")).toContain("atlasSkipsTranscript(");
});
