// [Atlas] A23 : zone des sessions divisée façon Blender. La zone active (la dernière cliquée) affiche
// la vue normale de T3, celle de l'adresse, avec ses panneaux ; les autres montrent leur session comme
// le side chat. À plusieurs zones, l'en-tête de la session active monte dans une barre du haut commune.
import { useNavigate } from "@tanstack/react-router";
import type { EnvironmentId, ScopedThreadRef, ThreadId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { BackgroundThreadContext } from "../../components/chat/backgroundThread";
import ChatView from "../../components/ChatView";
import { ComposerHandleContext } from "../../composerHandleContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { cn } from "../../lib/utils";
import { useThreadShell } from "../../state/entities";
import { buildThreadRouteParams } from "../../threadRoutes";
import {
  closePane,
  dragSeparator,
  leaves,
  type Pane,
  type PanesState,
  type PaneThread,
  parsePanes,
  sameThread,
  setLeafThread,
  setRatios,
  splitPane,
} from "./panes";
import { PaneActionsContext, TopBarContext } from "./paneActions";

const TEXT = Schema.String;

const NO_PARENT_PANEL = { openToolDiff: () => {}, runShellCommand: () => {} };
const EDITABLE = '[contenteditable="true"], textarea';
const SNAP_PX = 8;
let seq = 0;
// Unique dans l'arbre suffit : l'heure plus un compteur.
const newId = () => `${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

type LeafPane = Extract<Pane, { kind: "leaf" }>;

interface Ctx {
  readonly state: PanesState;
  readonly save: (next: PanesState) => void;
  readonly routeThread: PaneThread | null;
  readonly routeView: ReactNode;
  readonly activate: (leaf: LeafPane, refocus: boolean) => void;
  readonly close: (leaf: LeafPane) => void;
  readonly single: boolean;
  readonly mosaic: RefObject<HTMLDivElement | null>;
  /** Vrai une fois, pour la zone dont la saisie reprend le curseur en devenant la vue active. */
  readonly takeRefocus: (leafId: string) => boolean;
}

export function AtlasPanes(props: { routeThread: ScopedThreadRef | null; children: ReactNode }) {
  const navigate = useNavigate();
  const [text, setText] = useLocalStorage<string, string>("atlas:panes", "", TEXT);
  const [topBar, setTopBar] = useState<HTMLDivElement | null>(null);
  const mosaic = useRef<HTMLDivElement>(null);
  const refocus = useRef<string | null>(null);
  const lastRoute = useRef<string | null | undefined>(undefined);
  const routeThread = props.routeThread;
  const state = parsePanes(text, routeThread);
  const save = (next: PanesState) => setText(JSON.stringify(next));
  const active = leaves(state.root).find((leaf) => leaf.id === state.active)!;
  const routeKey = routeThread ? `${routeThread.environmentId}:${routeThread.threadId}` : null;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- la zone active suit la session ouverte par l'adresse (clic dans la barre latérale)
  useEffect(() => {
    // Seulement quand l'adresse change : entre le clic sur une zone et l'arrivée de son adresse,
    // l'ancienne adresse ne doit pas écraser la session de la zone qu'on vient d'activer.
    const changed = lastRoute.current !== routeKey;
    lastRoute.current = routeKey;
    if (
      routeThread !== null &&
      (changed || active.thread === null) &&
      !sameThread(active.thread, routeThread)
    ) {
      save(setLeafThread(state, active.id, routeThread));
    }
  });

  const open = (thread: PaneThread | null) => {
    if (thread === null) return;
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams({
        environmentId: thread.environmentId as EnvironmentId,
        threadId: thread.threadId as ThreadId,
      }),
    });
  };
  const activate = (leaf: LeafPane, focus: boolean) => {
    if (leaf.id === state.active) return;
    refocus.current = focus ? leaf.id : null;
    save({ ...state, active: leaf.id });
    open(leaf.thread);
  };
  const close = (leaf: LeafPane) => {
    const next = closePane(state, leaf.id);
    save(next);
    if (leaf.id === state.active) {
      open(leaves(next.root).find((other) => other.id === next.active)?.thread ?? null);
    }
  };

  const single = state.root.kind === "leaf";
  const ctx: Ctx = {
    state,
    save,
    routeThread,
    routeView: props.children,
    activate,
    close,
    single,
    mosaic,
    takeRefocus: (leafId) => {
      if (refocus.current !== leafId) return false;
      refocus.current = null;
      return true;
    },
  };
  return (
    <div data-atlas="A23" className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      {/* Barre du haut commune : reçoit l'en-tête de la session active. La marge de droite laisse la
          place aux boutons fixes de la fenêtre quand le panneau de droite est ouvert. */}
      {single ? null : (
        <div
          ref={setTopBar}
          data-atlas-topbar
          // oxlint-disable-next-line shadcn/no-arbitrary-values -- la largeur des boutons fixes de la fenêtre, après les boutons natifs
          className="drag-region h-[var(--workspace-topbar-height)] shrink-0 border-b border-border/60 has-[header>.absolute[data-workspace-titlebar-controls]]:pr-[calc(var(--workspace-controls-right)+10.5rem)]"
        />
      )}
      <TopBarContext value={single ? undefined : topBar}>
        <div ref={mosaic} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PaneNode pane={state.root} ctx={ctx} />
        </div>
      </TopBarContext>
    </div>
  );
}

function PaneNode({ pane, ctx }: { pane: Pane; ctx: Ctx }) {
  if (pane.kind === "leaf") return <Leaf leaf={pane} ctx={ctx} />;
  const row = pane.dir === "row";
  // Pendant le glissement, on bouge les séparations directement ; l'état n'est gardé qu'au relâché.
  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget;
    const root = ctx.mosaic.current;
    if (root === null) return;
    // Sans ça, le glissement sélectionne le texte des sessions.
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    const box = root.getBoundingClientRect();
    const extent = row ? box.width : box.height;
    let ratios: ReturnType<typeof dragSeparator> = [];
    const move = (e: PointerEvent) => {
      const pos = row ? (e.clientX - box.left) / box.width : (e.clientY - box.top) / box.height;
      ratios = dragSeparator(ctx.state, pane.id, pos, {
        alone: e.shiftKey,
        snap: SNAP_PX / extent,
      });
      for (const { id, ratio } of ratios) {
        const first = root.querySelector<HTMLElement>(`[data-atlas-split="${id}"]`);
        if (first) first.style.flexBasis = `${ratio * 100}%`;
      }
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      if (ratios.length > 0) ctx.save(setRatios(ctx.state, ratios));
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };
  return (
    <div className={cn("flex h-full min-h-0 w-full min-w-0", row ? "flex-row" : "flex-col")}>
      <div
        data-atlas-split={pane.id}
        className="min-h-0 min-w-0 flex-none overflow-hidden"
        style={{ flexBasis: `${pane.ratio * 100}%` }}
      >
        <PaneNode pane={pane.a} ctx={ctx} />
      </div>
      {/* Zone de prise large (2 unités) autour d'un trait d'un pixel. */}
      <div
        role="separator"
        aria-orientation={row ? "vertical" : "horizontal"}
        onPointerDown={drag}
        className={cn(
          "group/sep z-10 flex shrink-0 touch-none items-center justify-center select-none",
          row ? "-mx-1 w-2 cursor-col-resize" : "-my-1 h-2 cursor-row-resize",
        )}
      >
        <div
          className={cn(
            "bg-border/70 group-hover/sep:bg-primary/50",
            row ? "h-full w-px" : "h-px w-full",
          )}
        />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <PaneNode pane={pane.b} ctx={ctx} />
      </div>
    </div>
  );
}

function Leaf({ leaf, ctx }: { leaf: LeafPane; ctx: Ctx }) {
  const body = useRef<HTMLDivElement>(null);
  const shell = useThreadShell(leaf.thread as ScopedThreadRef | null);
  const isActive = leaf.id === ctx.state.active;
  const showsRoute =
    isActive && (ctx.routeThread === null || sameThread(leaf.thread, ctx.routeThread));
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- le clic dans la saisie d'une zone remplace sa vue : on rend le curseur à la nouvelle saisie
  useEffect(() => {
    if (showsRoute && ctx.takeRefocus(leaf.id)) {
      body.current?.querySelector<HTMLElement>(EDITABLE)?.focus();
    }
  });
  const split = (dir: "row" | "col") =>
    ctx.save(splitPane(ctx.state, leaf.id, dir, { split: newId(), leaf: newId() }));
  let content: ReactNode;
  if (showsRoute) {
    content = ctx.routeView;
  } else if (leaf.thread !== null) {
    content = (
      <BackgroundThreadContext value>
        <ComposerHandleContext value={null}>
          <ChatView
            key={`${leaf.thread.environmentId}:${leaf.thread.threadId}`}
            environmentId={leaf.thread.environmentId as EnvironmentId}
            threadId={leaf.thread.threadId as ThreadId}
            routeKind="server"
            embedded={NO_PARENT_PANEL}
          />
        </ComposerHandleContext>
      </BackgroundThreadContext>
    );
  } else {
    content = (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        {isActive ? "Open a session from the sidebar" : "Empty area: click, then pick a session"}
      </div>
    );
  }
  return (
    <section
      aria-label={isActive ? "Active area" : "Area"}
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col"
    >
      {/* Plusieurs zones : un bandeau fin avec le titre de la session, croix = fermer. */}
      {ctx.single ? null : (
        <div className="flex h-6 shrink-0 items-center gap-0.5 border-b border-border/60 px-1.5">
          <button
            type="button"
            aria-label="Make this the active area"
            onClick={() => ctx.activate(leaf, false)}
            className={cn(
              "h-full min-w-0 flex-1 cursor-default truncate text-left text-2xs",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {shell?.title ?? ""}
          </button>
          <button
            type="button"
            aria-label="Close area"
            onClick={() => ctx.close(leaf)}
            className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      )}
      {/* Un clic n'importe où dans la zone la rend active (la dernière cliquée a la main). */}
      <div
        ref={body}
        className="relative flex min-h-0 flex-1 flex-col"
        onClickCapture={(event) =>
          ctx.activate(leaf, (event.target as HTMLElement).closest(EDITABLE) !== null)
        }
      >
        <PaneActionsContext value={{ split }}>{content}</PaneActionsContext>
      </div>
    </section>
  );
}
