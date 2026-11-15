// [Atlas] A23 : zone des sessions divisée façon Blender. Un arbre binaire : chaque division coupe une
// zone en deux (à droite ou en bas) ; fermer une zone rend sa place à sa voisine. Logique pure.

export interface PaneThread {
  readonly environmentId: string;
  readonly threadId: string;
}
export type Pane =
  | { readonly kind: "leaf"; readonly id: string; readonly thread: PaneThread | null }
  | {
      readonly kind: "split";
      readonly id: string;
      readonly dir: "row" | "col";
      readonly ratio: number;
      readonly a: Pane;
      readonly b: Pane;
    };
export interface PanesState {
  readonly root: Pane;
  readonly active: string;
}

export const sameThread = (a: PaneThread | null, b: PaneThread | null) =>
  a !== null && b !== null && a.environmentId === b.environmentId && a.threadId === b.threadId;

export function leaves(pane: Pane): Array<Extract<Pane, { kind: "leaf" }>> {
  return pane.kind === "leaf" ? [pane] : [...leaves(pane.a), ...leaves(pane.b)];
}

function mapPane(pane: Pane, id: string, change: (pane: Pane) => Pane): Pane {
  if (pane.id === id) return change(pane);
  if (pane.kind === "leaf") return pane;
  return { ...pane, a: mapPane(pane.a, id, change), b: mapPane(pane.b, id, change) };
}

/** Coupe la zone en deux ; la nouvelle zone, vide, devient active. */
export function splitPane(
  state: PanesState,
  leafId: string,
  dir: "row" | "col",
  ids: { split: string; leaf: string },
): PanesState {
  const root = mapPane(state.root, leafId, (leaf) => ({
    kind: "split",
    id: ids.split,
    dir,
    ratio: 0.5,
    a: leaf,
    b: { kind: "leaf", id: ids.leaf, thread: null },
  }));
  return { root, active: ids.leaf };
}

/** Ferme la zone ; sa voisine prend toute la place (et devient active si c'était la zone active). */
export function closePane(state: PanesState, leafId: string): PanesState {
  const remove = (pane: Pane): Pane => {
    if (pane.kind === "leaf") return pane;
    if (pane.a.id === leafId) return pane.b;
    if (pane.b.id === leafId) return pane.a;
    return { ...pane, a: remove(pane.a), b: remove(pane.b) };
  };
  const root = remove(state.root);
  const active = leaves(root).some((leaf) => leaf.id === state.active)
    ? state.active
    : leaves(root)[0]!.id;
  return { root, active };
}

export function setLeafThread(state: PanesState, leafId: string, thread: PaneThread | null) {
  return { ...state, root: mapPane(state.root, leafId, (leaf) => ({ ...leaf, thread })) };
}

export function setRatio(state: PanesState, splitId: string, ratio: number): PanesState {
  const clamped = Math.min(0.9, Math.max(0.1, ratio));
  return {
    ...state,
    root: mapPane(state.root, splitId, (pane) => ({ ...pane, ratio: clamped })),
  };
}

/** Relit l'état gardé ; n'importe quel texte invalide redonne une seule zone. */
export function parsePanes(text: string, thread: PaneThread | null): PanesState {
  try {
    const state = JSON.parse(text) as PanesState;
    const all = leaves(state.root);
    if (all.some((leaf) => leaf.id === state.active)) return state;
  } catch {}
  return { root: { kind: "leaf", id: "main", thread }, active: "main" };
}
