// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A23 : zone des sessions divisée façon Blender.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import { closePane, leaves, parsePanes, setLeafThread, setRatio, splitPane } from "./panes";

const T = { environmentId: "e", threadId: "t" };

it("divise, ferme, et rend la place à la voisine", () => {
  let state = parsePanes("", T);
  state = splitPane(state, "main", "row", { split: "s1", leaf: "b" });
  expect(state.active).toBe("b");
  state = splitPane(state, "b", "col", { split: "s2", leaf: "c" });
  expect(leaves(state.root).map((leaf) => leaf.id)).toEqual(["main", "b", "c"]);
  state = setLeafThread(state, "c", { environmentId: "e", threadId: "u" });
  state = closePane(state, "b");
  expect(leaves(state.root).map((leaf) => leaf.id)).toEqual(["main", "c"]);
  expect(state.active).toBe("c");
  state = closePane(state, "c");
  expect(state.root).toEqual({ kind: "leaf", id: "main", thread: T });
  expect(state.active).toBe("main");
});

it("borne la taille d'une zone et relit un état abîmé comme une seule zone", () => {
  const state = splitPane(parsePanes("", T), "main", "row", { split: "s", leaf: "b" });
  const root = setRatio(state, "s", 2).root;
  expect(root.kind === "split" && root.ratio).toBe(0.9);
  expect(parsePanes("{oops", null).root).toEqual({ kind: "leaf", id: "main", thread: null });
  expect(parsePanes(JSON.stringify(state), null)).toEqual(state);
});

it("la vue des sessions passe par les zones", () => {
  const src = NodeFS.readFileSync(
    new URL("../../components/ThreadRouteView.tsx", import.meta.url),
    "utf8",
  );
  expect(src).toContain("<AtlasPanes routeThread=");
  const controls = NodeFS.readFileSync(
    new URL("../../components/chat/PanelLayoutControls.tsx", import.meta.url),
    "utf8",
  );
  expect(controls).toContain("<AtlasPaneButtons />");
});
