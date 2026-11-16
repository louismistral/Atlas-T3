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
  const clamped = clampRatio(ratio);
  return {
    ...state,
    root: mapPane(state.root, splitId, (pane) => ({ ...pane, ratio: clamped })),
  };
}

interface Separator {
  readonly id: string;
  readonly dir: "row" | "col";
  /** Le long de son axe, en fraction de la mosaïque : la séparation, puis le début et la taille de sa division. */
  readonly pos: number;
  readonly start: number;
  readonly size: number;
  /** Les divisions qui la contiennent : elle bouge quand l'une d'elles bouge. */
  readonly inside: ReadonlyArray<string>;
}

function separators(
  pane: Pane,
  box = { x: 0, y: 0, w: 1, h: 1 },
  inside: ReadonlyArray<string> = [],
): Separator[] {
  if (pane.kind === "leaf") return [];
  const row = pane.dir === "row";
  const start = row ? box.x : box.y;
  const size = row ? box.w : box.h;
  const cut = size * pane.ratio;
  const a = row ? { ...box, w: cut } : { ...box, h: cut };
  const b = row
    ? { ...box, x: box.x + cut, w: box.w - cut }
    : { ...box, y: box.y + cut, h: box.h - cut };
  const within = [...inside, pane.id];
  return [
    { id: pane.id, dir: pane.dir, pos: start + cut, start, size, inside },
    ...separators(pane.a, a, within),
    ...separators(pane.b, b, within),
  ];
}

const clampRatio = (ratio: number) => Math.min(0.9, Math.max(0.1, ratio));
const ALIGNED = 0.002;

/**
 * Tirer une séparation jusqu'à `pos` : celles qui sont alignées avec elle suivent, et l'ensemble
 * s'accroche aux autres séparations de même sens à moins de `snap`. `alone` (Maj) : elle seule, libre.
 */
export function dragSeparator(
  state: PanesState,
  id: string,
  pos: number,
  opts: { readonly alone: boolean; readonly snap: number },
): Array<{ readonly id: string; readonly ratio: number }> {
  const all = separators(state.root);
  const own = all.find((sep) => sep.id === id);
  if (own === undefined) return [];
  const same = all.filter((sep) => sep.dir === own.dir);
  // shortcut: alignées suffit, même sans se toucher ; exiger qu'elles se touchent si ça gêne.
  const group = opts.alone ? [own] : same.filter((sep) => Math.abs(sep.pos - own.pos) < ALIGNED);
  const moving = new Set(group.map((sep) => sep.id));
  const anchors = opts.alone
    ? []
    : same
        .filter((sep) => !moving.has(sep.id) && !sep.inside.some((parent) => moving.has(parent)))
        .filter((sep) => Math.abs(sep.pos - pos) < opts.snap)
        .toSorted((x, y) => Math.abs(x.pos - pos) - Math.abs(y.pos - pos));
  const target = anchors[0]?.pos ?? pos;
  return group.map((sep) => ({ id: sep.id, ratio: clampRatio((target - sep.start) / sep.size) }));
}

export function setRatios(
  state: PanesState,
  ratios: ReadonlyArray<{ readonly id: string; readonly ratio: number }>,
): PanesState {
  return ratios.reduce((next, { id, ratio }) => setRatio(next, id, ratio), state);
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
