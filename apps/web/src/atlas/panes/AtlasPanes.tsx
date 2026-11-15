// [Atlas] A23 : zone des sessions divisée façon Blender.
// La zone active affiche la vue normale de T3 (celle de l'adresse, avec tous ses panneaux) : un clic
// dans la barre latérale y ouvre donc la session. Les autres zones montrent leur session comme le
// side chat de T3 (conversation et saisie). Un clic sur le bandeau d'une zone la rend active.
import { useNavigate } from "@tanstack/react-router";
import type { EnvironmentId, ScopedThreadRef, ThreadId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { Columns2Icon, Rows2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { BackgroundThreadContext } from "../../components/chat/backgroundThread";
import ChatView from "../../components/ChatView";
import { ComposerHandleContext } from "../../composerHandleContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { cn } from "../../lib/utils";
import { buildThreadRouteParams } from "../../threadRoutes";
import {
  closePane,
  leaves,
  type Pane,
  type PanesState,
  type PaneThread,
  parsePanes,
  sameThread,
  setLeafThread,
  setRatio,
  splitPane,
} from "./panes";

const TEXT = Schema.String;
const NO_PARENT_PANEL = { openToolDiff: () => {}, runShellCommand: () => {} };
let seq = 0;
// Unique dans l'arbre suffit : l'heure plus un compteur.
const newId = () => `${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

interface Ctx {
  readonly state: PanesState;
  readonly save: (next: PanesState) => void;
  readonly routeThread: PaneThread | null;
  readonly routeView: ReactNode;
  readonly activate: (leaf: Extract<Pane, { kind: "leaf" }>) => void;
  readonly single: boolean;
}

export function AtlasPanes(props: { routeThread: ScopedThreadRef | null; children: ReactNode }) {
  const navigate = useNavigate();
  const [text, setText] = useLocalStorage<string, string>("atlas:panes", "", TEXT);
  const routeThread = props.routeThread;
  const state = parsePanes(text, routeThread);
  const save = (next: PanesState) => setText(JSON.stringify(next));
  const active = leaves(state.root).find((leaf) => leaf.id === state.active)!;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- la zone active suit la session ouverte par l'adresse (clic dans la barre latérale)
  useEffect(() => {
    if (routeThread !== null && !sameThread(active.thread, routeThread)) {
      save(setLeafThread(state, active.id, routeThread));
    }
  });

  const activate = (leaf: Extract<Pane, { kind: "leaf" }>) => {
    if (leaf.id === state.active) return;
    save({ ...state, active: leaf.id });
    if (leaf.thread !== null) {
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams({
          environmentId: leaf.thread.environmentId as EnvironmentId,
          threadId: leaf.thread.threadId as ThreadId,
        }),
      });
    }
  };

  const ctx: Ctx = {
    state,
    save,
    routeThread,
    routeView: props.children,
    activate,
    single: state.root.kind === "leaf",
  };
  return (
    <div data-atlas="A23" className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <PaneNode pane={state.root} ctx={ctx} />
    </div>
  );
}

function PaneNode({ pane, ctx }: { pane: Pane; ctx: Ctx }) {
  const first = useRef<HTMLDivElement>(null);
  if (pane.kind === "leaf") return <Leaf leaf={pane} ctx={ctx} />;
  const row = pane.dir === "row";
  // Pendant le glissement, on bouge la séparation directement ; l'état n'est gardé qu'au relâché.
  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.parentElement!.getBoundingClientRect();
    const ratioAt = (e: PointerEvent) =>
      row ? (e.clientX - box.left) / box.width : (e.clientY - box.top) / box.height;
    let ratio = pane.ratio;
    const move = (e: PointerEvent) => {
      ratio = Math.min(0.9, Math.max(0.1, ratioAt(e)));
      if (first.current) first.current.style.flexBasis = `${ratio * 100}%`;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      ctx.save(setRatio(ctx.state, pane.id, ratio));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className={cn("flex h-full min-h-0 w-full min-w-0", row ? "flex-row" : "flex-col")}>
      <div
        ref={first}
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
          "group/sep z-10 flex shrink-0 items-center justify-center",
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

function Leaf({ leaf, ctx }: { leaf: Extract<Pane, { kind: "leaf" }>; ctx: Ctx }) {
  const isActive = leaf.id === ctx.state.active;
  const split = (dir: "row" | "col") =>
    ctx.save(splitPane(ctx.state, leaf.id, dir, { split: newId(), leaf: newId() }));
  let content: ReactNode;
  if (isActive && (ctx.routeThread === null || sameThread(leaf.thread, ctx.routeThread))) {
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
      <button
        type="button"
        onClick={() => ctx.activate(leaf)}
        className="flex h-full w-full items-center justify-center text-xs text-muted-foreground"
      >
        {isActive ? "Open a session from the sidebar" : "Empty area: click, then pick a session"}
      </button>
    );
  }
  return (
    <section
      aria-label={isActive ? "Active area" : "Area"}
      className={cn(
        "group/pane relative flex h-full min-h-0 w-full min-w-0 flex-col",
        isActive && !ctx.single && "ring-1 ring-primary/40 ring-inset",
      )}
    >
      {/* Une seule zone : les boutons n'apparaissent qu'au survol du haut ; sinon un bandeau fin. */}
      <div
        className={cn(
          "flex h-6 shrink-0 items-center gap-0.5 px-1.5",
          ctx.single
            ? "absolute top-0 left-1/2 z-20 -translate-x-1/2 rounded-b-md bg-background opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100"
            : "border-b border-border/60",
        )}
      >
        {ctx.single ? null : (
          <button
            type="button"
            aria-label="Make this the active area"
            onClick={() => ctx.activate(leaf)}
            className="h-full min-w-0 flex-1 cursor-default text-left"
          >
            <span
              aria-hidden
              className={cn(
                "inline-block size-1.5 rounded-full",
                isActive ? "bg-primary" : "bg-muted-foreground/30",
              )}
            />
          </button>
        )}
        <PaneButton label="Split right" onClick={() => split("row")}>
          <Columns2Icon className="size-3" />
        </PaneButton>
        <PaneButton label="Split down" onClick={() => split("col")}>
          <Rows2Icon className="size-3" />
        </PaneButton>
        {ctx.single ? null : (
          <PaneButton label="Close area" onClick={() => ctx.save(closePane(ctx.state, leaf.id))}>
            <XIcon className="size-3" />
          </PaneButton>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">{content}</div>
    </section>
  );
}

function PaneButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {props.children}
    </button>
  );
}
