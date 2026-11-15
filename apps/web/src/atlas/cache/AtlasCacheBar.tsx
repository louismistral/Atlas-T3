// [Atlas] A4 : barre du cache au-dessus de la saisie (chrono) et jetons du dernier tour en pastilles.
import {
  type AtlasCacheMode,
  atlasCacheMode,
  atlasNextCacheMode,
  type OrchestrationV2ProviderTurn,
  type ScopedThreadRef,
} from "@t3tools/contracts";
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  DatabaseIcon,
  CircleOffIcon,
  DollarSignIcon,
  FlameIcon,
  FoldVerticalIcon,
  PenLineIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";
import { threadEnvironment } from "../../state/threads";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";
import {
  apiCostUsd,
  formatCountdown,
  formatTokens,
  formatUsd,
  latestUsageTurn,
  turnTokens,
} from "./cacheBar.logic";

const EMPTY: readonly Pick<OrchestrationV2ProviderTurn, "tokenUsage" | "model">[] = [];

function useNow(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- minuteur du chrono, actif jusqu'à l'expiration du cache
  useEffect(() => {
    if (until === null || until <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return now;
}

function Pill(props: { icon: LucideIcon; value: string; label: string }) {
  const Icon = props.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex h-5 w-14 items-center gap-1 rounded-full border border-border/70 px-1.5 text-2xs text-muted-foreground tabular-nums" />
        }
      >
        <Icon aria-hidden className="size-3" />
        <span aria-label={props.label}>{props.value}</span>
      </TooltipTrigger>
      <TooltipPopup side="top">{props.label}</TooltipPopup>
    </Tooltip>
  );
}

// [Atlas] A24 : bouton à 3 états, le choix reste sur la session (tag)
const MODE_UI: Record<AtlasCacheMode, { icon: LucideIcon; label: string }> = {
  compact: { icon: FoldVerticalIcon, label: "Auto-compact 3 min before the cache expires" },
  off: { icon: CircleOffIcon, label: "Auto-compact off" },
  warm: { icon: FlameIcon, label: "Keep the cache warm: a short message renews it for 60 min" },
};

function CacheModeButton(props: {
  threadRef: ScopedThreadRef;
  tags: readonly string[] | undefined;
}) {
  const setTag = useOrchestrationCommand(threadEnvironment.setTag, { reportFailure: true });
  const mode = atlasCacheMode(props.tags);
  const ui = MODE_UI[mode];
  const Icon = ui.icon;
  const cycle = async () => {
    for (const change of atlasNextCacheMode(mode).changes) {
      await setTag({
        environmentId: props.threadRef.environmentId,
        input: { threadId: props.threadRef.threadId, ...change },
      });
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={ui.label}
            onClick={() => void cycle()}
            className={cn(
              "inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 hover:bg-accent",
              mode === "off" ? "text-muted-foreground/60" : "text-muted-foreground",
              mode === "warm" && "text-warning",
            )}
          />
        }
      >
        <Icon aria-hidden className="size-3" />
      </TooltipTrigger>
      <TooltipPopup side="top">{ui.label}</TooltipPopup>
    </Tooltip>
  );
}

export function AtlasCacheBar(props: {
  turns: readonly Pick<OrchestrationV2ProviderTurn, "tokenUsage" | "model">[] | undefined;
  threadRef?: ScopedThreadRef | null; // [Atlas] A24
  tags?: readonly string[] | undefined;
}) {
  const latest = latestUsageTurn(props.turns ?? EMPTY);
  const expiresAt = latest?.usage.promptCacheExpiresAt
    ? Date.parse(latest.usage.promptCacheExpiresAt)
    : null;
  const now = useNow(expiresAt);
  if (latest === null) return null;
  const t = turnTokens(latest.usage);
  const cost = apiCostUsd(latest.model, t);
  const ttl = latest.usage.promptCacheTtlMs ?? null;
  const left = expiresAt === null ? null : Math.max(0, expiresAt - now);
  const share = left === null || ttl === null ? 0 : Math.min(1, left / ttl);
  const calls = t.calls > 1 ? ` (${t.calls} calls)` : "";
  return (
    <div data-atlas="A4" className="flex h-7 items-center gap-3 px-1.5 pb-1.5">
      {/* Fond opaque qui couvre tout le bas de la conversation, saisie comprise, et s'estompe vite vers le haut */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -top-12 bottom-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to top, var(--color-background) calc(100% - 3rem), transparent)",
        }}
      />
      {/* Positions fixes : la barre, le chrono, puis les pastilles ne bougent pas d'un tour à l'autre */}
      <span className="relative h-1 min-w-12 flex-1 overflow-hidden rounded-full bg-muted">
        {left !== null ? (
          <span
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear",
              share > 1 / 3 ? "bg-success" : share > 1 / 12 ? "bg-warning" : "bg-error",
            )}
            style={{ width: `${share * 100}%` }}
          />
        ) : null}
      </span>
      <span className="w-10 shrink-0 text-right text-2xs text-muted-foreground tabular-nums">
        {left === null ? "·" : left > 0 ? formatCountdown(left) : "cold"}
      </span>
      {props.threadRef ? <CacheModeButton threadRef={props.threadRef} tags={props.tags} /> : null}
      <span className="flex shrink-0 items-center gap-1">
        <Pill icon={DatabaseIcon} value={formatTokens(t.read)} label={`Read from cache${calls}`} />
        <Pill
          icon={PenLineIcon}
          value={formatTokens(t.write5m + t.write1h)}
          label="Written to cache"
        />
        <Pill
          icon={ArrowDownToLineIcon}
          value={formatTokens(t.uncached)}
          label="Input read without cache"
        />
        <Pill icon={ArrowUpFromLineIcon} value={formatTokens(t.output)} label="Output" />
        <Pill
          icon={DollarSignIcon}
          value={cost === null ? "·" : formatUsd(cost).replace("$", "")}
          label="API price equivalent for the last turn (the subscription is not billed in dollars)"
        />
      </span>
    </div>
  );
}
