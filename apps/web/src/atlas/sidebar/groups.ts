// [Atlas] A16 : regroupement de la barre (aucun, projet, état), repris de la barre d'Atlas.
// Logique pure : Sidebar.tsx fournit les fils déjà triés en sections par T3 et rend le résultat.
import type { SidebarThreadStatus } from "../../components/Sidebar.logic";

// "t3" garde la barre d'origine de T3 : un retour sûr si une mise à jour casse la nôtre.
export const ATLAS_GROUP_BY = ["none", "project", "state", "t3"] as const;
export type AtlasGroupBy = (typeof ATLAS_GROUP_BY)[number];
export const ATLAS_GROUP_BY_LABELS: Record<AtlasGroupBy, string> = {
  none: "No group",
  project: "Project",
  state: "State",
  t3: "T3 default",
};

export type AtlasThreadState =
  | "needsYou"
  | "working"
  | "retry"
  | "unread"
  | "idle"
  | "snoozed"
  | "settled";
const ATLAS_STATE_ORDER: readonly AtlasThreadState[] = [
  "needsYou",
  "working",
  "retry",
  "unread",
  "idle",
  "snoozed",
  "settled",
];
const ATLAS_STATE_LABELS: Record<AtlasThreadState, string> = {
  needsYou: "Needs you",
  working: "Working",
  retry: "Retry",
  unread: "Unread",
  idle: "Idle",
  snoozed: "Snoozed",
  settled: "Settled",
};

export function atlasThreadState(input: {
  shelf: "snoozed" | "settled" | null;
  status: SidebarThreadStatus;
  unread: boolean;
}): AtlasThreadState {
  if (input.shelf !== null) return input.shelf;
  switch (input.status) {
    case "approval":
    case "input":
    case "request":
      return "needsYou";
    case "preparing":
    case "working":
    case "waiting":
      return "working";
    case "failed":
    case "limited":
      return "retry";
    default:
      return input.unread ? "unread" : "idle";
  }
}

export interface AtlasSection<T, G> {
  readonly key: string;
  // "plain" n'a pas d'en-tête (la liste de « No group ») ; "project" prend l'en-tête de dossier de T3.
  readonly kind: "header" | "project" | "plain";
  readonly label: string;
  readonly group: G | null;
  readonly collapsed: boolean;
  readonly count: number;
  readonly threads: readonly T[];
  // Fils cachés d'une section repliée (le fil ouvert reste visible, comme dans T3).
  readonly hidden: readonly T[];
}

export function buildAtlasSections<T, G>(input: {
  readonly groupBy: Exclude<AtlasGroupBy, "t3">;
  readonly pinned: readonly T[];
  readonly others: readonly T[];
  readonly collapsedKeys: ReadonlySet<string>;
  readonly routeKey: string | null;
  readonly keyOf: (thread: T) => string;
  readonly activityOf: (thread: T) => number;
  readonly stateOf: (thread: T) => AtlasThreadState;
  readonly projectFolders: (threads: readonly T[]) => ReadonlyArray<{ group: G; threads: T[] }>;
  readonly projectKeyOf: (group: G) => string;
  readonly projectLabelOf: (group: G) => string;
}): { sections: AtlasSection<T, G>[]; orderedKeys: string[] } {
  const sorted = input.others.toSorted((a, b) => input.activityOf(b) - input.activityOf(a));
  const sections: AtlasSection<T, G>[] = [];
  const add = (
    key: string,
    kind: AtlasSection<T, G>["kind"],
    label: string,
    threads: readonly T[],
    group: G | null = null,
  ) => {
    const collapsed = kind !== "plain" && input.collapsedKeys.has(key);
    sections.push({
      key,
      kind,
      label,
      group,
      collapsed,
      count: threads.length,
      threads: collapsed ? threads.filter((t) => input.keyOf(t) === input.routeKey) : threads,
      hidden: collapsed ? threads.filter((t) => input.keyOf(t) !== input.routeKey) : [],
    });
  };
  if (input.pinned.length > 0) add("pinned", "header", "Pinned", input.pinned);
  if (input.groupBy === "none") {
    if (sorted.length > 0) add("all", "plain", "", sorted);
  } else if (input.groupBy === "project") {
    for (const folder of input.projectFolders(sorted)) {
      add(
        `p:${input.projectKeyOf(folder.group)}`,
        "project",
        input.projectLabelOf(folder.group),
        folder.threads,
        folder.group,
      );
    }
  } else {
    const byState = new Map<AtlasThreadState, T[]>();
    for (const thread of sorted) {
      const state = input.stateOf(thread);
      byState.set(state, [...(byState.get(state) ?? []), thread]);
    }
    for (const state of ATLAS_STATE_ORDER) {
      const threads = byState.get(state);
      if (threads) add(`s:${state}`, "header", ATLAS_STATE_LABELS[state], threads);
    }
  }
  return {
    sections,
    orderedKeys: sections.flatMap((section) => section.threads.map(input.keyOf)),
  };
}
