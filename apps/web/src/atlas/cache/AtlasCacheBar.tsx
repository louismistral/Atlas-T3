// [Atlas] A4 : barre du cache au-dessus de la saisie (chrono) et jetons du dernier tour en pastilles.
import type { OrchestrationV2ProviderTurn } from "@t3tools/contracts";
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  DatabaseIcon,
  DollarSignIcon,
  PenLineIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";
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
          <span className="inline-flex h-5 items-center gap-1 rounded-full border border-border/70 px-1.5 text-2xs text-muted-foreground tabular-nums" />
        }
      >
        <Icon aria-hidden className="size-3" />
        <span aria-label={props.label}>{props.value}</span>
      </TooltipTrigger>
      <TooltipPopup side="top">{props.label}</TooltipPopup>
    </Tooltip>
  );
}

export function AtlasCacheBar(props: {
  turns: readonly Pick<OrchestrationV2ProviderTurn, "tokenUsage" | "model">[] | undefined;
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
    <div
      data-atlas="A4"
      className="relative -mt-6 flex flex-col gap-1 bg-linear-to-t from-background from-70% to-transparent px-1 pt-6 pb-1.5"
    >
      {left !== null ? (
        <div className="flex items-center gap-2 text-2xs text-muted-foreground tabular-nums">
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-linear",
                share > 1 / 3 ? "bg-success" : share > 1 / 12 ? "bg-warning" : "bg-error",
              )}
              style={{ width: `${share * 100}%` }}
            />
          </span>
          <span>{left > 0 ? `Cache ${formatCountdown(left)}` : "Cache cold"}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
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
        {cost !== null ? (
          <Pill
            icon={DollarSignIcon}
            value={formatUsd(cost).replace("$", "")}
            label="API price equivalent for the last turn (the subscription is not billed in dollars)"
          />
        ) : null}
      </div>
    </div>
  );
}
