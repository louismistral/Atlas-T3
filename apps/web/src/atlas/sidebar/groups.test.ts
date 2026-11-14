// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A16 : protège la barre regroupée (sections, état, raccordements dans T3).
import * as NodeFS from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { atlasThreadState, buildAtlasSections, type AtlasThreadState } from "./groups";

type T = { key: string; at: number; state: AtlasThreadState; project: string };
const t = (key: string, at: number, state: AtlasThreadState = "idle", project = "a"): T => ({
  key,
  at,
  state,
  project,
});

const build = (
  groupBy: "none" | "project" | "state",
  others: T[],
  extra: { pinned?: T[]; collapsed?: string[]; routeKey?: string } = {},
) =>
  buildAtlasSections<T, string>({
    groupBy,
    pinned: extra.pinned ?? [],
    others,
    collapsedKeys: new Set(extra.collapsed ?? []),
    routeKey: extra.routeKey ?? null,
    keyOf: (x) => x.key,
    activityOf: (x) => x.at,
    stateOf: (x) => x.state,
    projectFolders: (threads) =>
      ["a", "b"].map((group) => ({ group, threads: threads.filter((x) => x.project === group) })),
    projectKeyOf: (g) => g,
    projectLabelOf: (g) => g.toUpperCase(),
  });

describe("buildAtlasSections", () => {
  it("No group : épinglées puis une seule liste, la plus récente en haut", () => {
    const { sections, orderedKeys } = build("none", [t("old", 1), t("new", 3, "settled")], {
      pinned: [t("pin", 0)],
    });
    expect(sections.map((s) => [s.key, s.kind])).toEqual([
      ["pinned", "header"],
      ["all", "plain"],
    ]);
    expect(orderedKeys).toEqual(["pin", "new", "old"]);
  });

  it("State : sections dans l'ordre d'Atlas, vides omises", () => {
    const { sections } = build("state", [
      t("s", 5, "settled"),
      t("w", 2, "working"),
      t("n", 1, "needsYou"),
    ]);
    expect(sections.map((s) => s.label)).toEqual(["Needs you", "Working", "Settled"]);
  });

  it("Project : un dossier par projet", () => {
    const { sections } = build("project", [t("x", 1, "idle", "b"), t("y", 2, "idle", "a")]);
    expect(sections.map((s) => [s.key, s.kind, s.label, s.count])).toEqual([
      ["p:a", "project", "A", 1],
      ["p:b", "project", "B", 1],
    ]);
  });

  it("une section repliée ne garde que le fil ouvert", () => {
    const { sections, orderedKeys } = build("state", [t("a", 2), t("b", 1)], {
      collapsed: ["s:idle"],
      routeKey: "b",
    });
    expect(sections[0]!.collapsed).toBe(true);
    expect(orderedKeys).toEqual(["b"]);
    expect(sections[0]!.hidden.map((x) => x.key)).toEqual(["a"]);
    expect(sections[0]!.count).toBe(2);
  });
});

describe("atlasThreadState", () => {
  it("classe les statuts de T3", () => {
    expect(atlasThreadState({ shelf: null, status: "approval", unread: false })).toBe("needsYou");
    expect(atlasThreadState({ shelf: null, status: "working", unread: true })).toBe("working");
    expect(atlasThreadState({ shelf: null, status: "limited", unread: false })).toBe("retry");
    expect(atlasThreadState({ shelf: null, status: "ready", unread: true })).toBe("unread");
    expect(atlasThreadState({ shelf: null, status: "ready", unread: false })).toBe("idle");
    expect(atlasThreadState({ shelf: "settled", status: "approval", unread: true })).toBe(
      "settled",
    );
  });
});

it("Sidebar.tsx et SidebarThreadRow.tsx gardent les raccordements A16", () => {
  const read = (p: string) => NodeFS.readFileSync(new URL(p, import.meta.url), "utf8");
  expect(read("../../components/Sidebar.tsx")).toContain("useAtlasSidebar(");
  expect(read("../../components/Sidebar.tsx")).toContain("<AtlasGroupMenu");
  expect(read("../../components/sidebar/SidebarThreadRow.tsx")).toContain("props.atlasRow");
});
