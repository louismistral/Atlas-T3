// @effect-diagnostics nodeBuiltinImport:off - lit les fichiers source de T3.
// [Atlas] A23 : zone des sessions divisée façon Blender.
import * as NodeFS from "node:fs";
import { expect, it } from "vite-plus/test";
import {
  closePane,
  crossingSeparator,
  dragSeparator,
  leaves,
  parsePanes,
  setLeafThread,
  setRatio,
  setRatios,
  splitPane,
} from "./panes";

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

it("les séparations alignées bougent ensemble, Maj en bouge une seule, et elles s'accrochent", () => {
  // Quatre zones : une séparation verticale sur toute la hauteur, une horizontale de chaque côté.
  let state = splitPane(parsePanes("", T), "main", "row", { split: "v", leaf: "b" });
  state = splitPane(state, "main", "col", { split: "left", leaf: "c" });
  state = splitPane(state, "b", "col", { split: "right", leaf: "d" });
  const opts = { alone: false, snap: 0.01 };
  expect(dragSeparator(state, "left", 0.3, opts)).toEqual([
    { id: "left", ratio: 0.3 },
    { id: "right", ratio: 0.3 },
  ]);
  const alone = dragSeparator(state, "left", 0.3, { alone: true, snap: 0.01 });
  expect(alone).toEqual([{ id: "left", ratio: 0.3 }]);
  // Maj lâchée près d'une autre : elle s'y raccroche quand même.
  expect(dragSeparator(state, "left", 0.505, { alone: true, snap: 0.01 })).toEqual([
    { id: "left", ratio: 0.5 },
  ]);
  // À l'angle où elles se rejoignent, on prend aussi la séparation de l'autre sens.
  const tol = { x: 0.01, y: 0.01 };
  expect(crossingSeparator(state, "v", { x: 0.5, y: 0.495 }, tol)).toBe("left");
  expect(crossingSeparator(state, "left", { x: 0.495, y: 0.5 }, tol)).toBe("v");
  expect(crossingSeparator(state, "v", { x: 0.5, y: 0.2 }, tol)).toBeUndefined();
  // Désalignée, elle bouge seule, puis se raccroche à l'autre en passant près d'elle.
  state = setRatios(state, alone);
  expect(dragSeparator(state, "right", 0.7, opts)).toEqual([{ id: "right", ratio: 0.7 }]);
  expect(dragSeparator(state, "left", 0.495, opts)).toEqual([{ id: "left", ratio: 0.5 }]);
  expect(dragSeparator(state, "v", 0.25, opts)).toEqual([{ id: "v", ratio: 0.25 }]);
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
  const chat = NodeFS.readFileSync(
    new URL("../../components/ChatView.tsx", import.meta.url),
    "utf8",
  );
  expect(chat).toContain("<AtlasTopBarHeader");
});
