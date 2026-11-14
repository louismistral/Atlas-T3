// [Atlas] A16 : barre regroupée à la façon d'Atlas (No group, Project, State), avec les pièces de T3.
import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { resolveThreadActivityTimestamp } from "@t3tools/client-runtime/state/thread-sort";
import * as Schema from "effect/Schema";
import { LayersIcon } from "lucide-react";

import {
  groupSidebarThreadsByProject,
  hasUnseenCompletion,
  resolveSidebarThreadStatus,
  resolveThreadLastVisitedAt,
} from "../../components/Sidebar.logic";
import { SidebarHeaderIconButton } from "../../components/sidebar/SidebarThreadHeader";
import { CollapsibleSectionHeader } from "../../components/ui/collapsible-section-header";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "../../components/ui/menu";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { useUiStateStore } from "../../uiStateStore";
import {
  ATLAS_GROUP_BY,
  ATLAS_GROUP_BY_LABELS,
  atlasThreadState,
  buildAtlasSections,
  type AtlasGroupBy,
  type AtlasSection,
} from "./groups";

type Thread = EnvironmentThreadShell;
const keyOf = (thread: Thread) => scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id));
const EMPTY: readonly string[] = [];
const GROUP_BY_SCHEMA = Schema.Literals(ATLAS_GROUP_BY);
const COLLAPSED_SCHEMA = Schema.Array(Schema.String);

export type AtlasSidebarSection = AtlasSection<Thread, SidebarProjectSnapshot>;

// Objets fixes : SidebarThreadRow est mémoïsée, un objet neuf à chaque rendu la redessinerait.
const ROW_LAYOUTS = {
  plain: { indent: false, showProject: true },
  indented: { indent: true, showProject: true },
  inProject: { indent: true, showProject: false },
  flatInProject: { indent: false, showProject: false },
} as const;
export function atlasRowLayout(indent: boolean, showProject: boolean) {
  if (showProject) return indent ? ROW_LAYOUTS.indented : ROW_LAYOUTS.plain;
  return indent ? ROW_LAYOUTS.inProject : ROW_LAYOUTS.flatInProject;
}

export function useAtlasGroupBy() {
  return useLocalStorage<AtlasGroupBy, AtlasGroupBy>(
    "atlas:sidebar-group-by",
    "project",
    GROUP_BY_SCHEMA,
  );
}

export function useAtlasSidebar(input: {
  readonly pinned: readonly Thread[];
  readonly active: readonly Thread[];
  readonly working: readonly Thread[];
  readonly snoozed: readonly Thread[];
  readonly settled: readonly Thread[];
  readonly routeKey: string | null;
  readonly projectGroups: readonly SidebarProjectSnapshot[];
  readonly keepEmptyFolders: (group: SidebarProjectSnapshot) => boolean;
}) {
  const [groupBy, setGroupBy] = useAtlasGroupBy();
  const [collapsed, setCollapsed] = useLocalStorage<readonly string[], readonly string[]>(
    "atlas:sidebar-collapsed",
    EMPTY,
    COLLAPSED_SCHEMA,
  );
  const lastVisitedById = useUiStateStore((state) => state.threadLastVisitedAtById);
  const snoozedKeys = new Set(input.snoozed.map(keyOf));
  const settledKeys = new Set(input.settled.map(keyOf));
  const view =
    groupBy === "t3"
      ? null
      : buildAtlasSections<Thread, SidebarProjectSnapshot>({
          groupBy,
          pinned: input.pinned,
          others: [...input.active, ...input.working, ...input.snoozed, ...input.settled],
          collapsedKeys: new Set(collapsed),
          routeKey: input.routeKey,
          keyOf,
          activityOf: (thread) => Date.parse(resolveThreadActivityTimestamp(thread) ?? "") || 0,
          stateOf: (thread) => {
            const key = keyOf(thread);
            return atlasThreadState({
              shelf: settledKeys.has(key) ? "settled" : snoozedKeys.has(key) ? "snoozed" : null,
              status: resolveSidebarThreadStatus(thread),
              unread: hasUnseenCompletion({
                ...thread,
                lastVisitedAt: resolveThreadLastVisitedAt(
                  thread.lastVisitedAt,
                  lastVisitedById[key],
                ),
              }),
            });
          },
          projectFolders: (threads) =>
            groupSidebarThreadsByProject(input.projectGroups, threads, input.keepEmptyFolders),
          projectKeyOf: (group) => group.projectKey,
          projectLabelOf: (group) => group.displayName,
        });
  const sections = view?.sections ?? [];
  return {
    groupBy,
    setGroupBy,
    // null : barre d'origine de T3 ("T3 default").
    sections: view === null ? null : sections,
    orderedKeys: view?.orderedKeys ?? null,
    threadByKey:
      view === null
        ? null
        : new Map(sections.flatMap((s) => s.threads.map((t) => [keyOf(t), t] as const))),
    toggle: (key: string) =>
      setCollapsed((current) =>
        current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
      ),
    // « Show more » des settled : seulement si elles ne sont pas dans une section repliée.
    showMoreSettled: !(groupBy === "state" && collapsed.includes("s:settled")),
  };
}

export function AtlasSectionHeader(props: { section: AtlasSidebarSection; onToggle: () => void }) {
  return (
    <li data-atlas="A16" className="relative mx-0.5 mt-1 h-8 list-none first:mt-0">
      <CollapsibleSectionHeader
        data-sidebar-row={`atlas:${props.section.key}`}
        onClick={props.onToggle}
        expanded={!props.section.collapsed}
        accessory={<span className="font-normal tabular-nums">{props.section.count}</span>}
      >
        {props.section.label}
      </CollapsibleSectionHeader>
    </li>
  );
}

export function AtlasGroupMenu(props: {
  value: AtlasGroupBy;
  onChange: (value: AtlasGroupBy) => void;
}) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <SidebarHeaderIconButton
            data-atlas="A16"
            label={`Group threads: ${ATLAS_GROUP_BY_LABELS[props.value]}`}
          />
        }
      >
        <LayersIcon className="size-4" />
      </MenuTrigger>
      <MenuPopup align="start">
        <MenuGroup>
          <MenuGroupLabel>Group by</MenuGroupLabel>
          <MenuRadioGroup
            value={props.value}
            onValueChange={(value) => props.onChange(value as AtlasGroupBy)}
          >
            {ATLAS_GROUP_BY.map((value) => (
              <MenuRadioItem key={value} value={value} closeOnClick>
                {ATLAS_GROUP_BY_LABELS[value]}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
