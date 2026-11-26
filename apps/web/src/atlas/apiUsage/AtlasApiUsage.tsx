// [Atlas] A32 : quotas d'API externes (Etsy Redline, Etsy File Drawer) dans un petit panneau en bas à
// droite, à côté de la saisie, affiché ou caché par un bouton de la barre du haut. Le serveur lit les
// relevés que les scripts écrivent dans ~/.claude/atlas/api-usage/.
import { formatDuration } from "@t3tools/shared/usageLimits";
import { GaugeIcon } from "lucide-react";
import * as Schema from "effect/Schema";
import { useEffect, useState } from "react";

import { Toggle } from "../../components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { readDesktopPrimaryBearerToken } from "../../environments/primary/desktopAuth";
import { resolvePrimaryEnvironmentHttpUrl } from "../../environments/primary/target";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useNowMinute } from "../../hooks/useNowMinute";
import { cn } from "../../lib/utils";

interface ApiUsage {
  readonly label: string;
  readonly limit: number;
  readonly remaining: number;
  readonly perSecond: { readonly limit: number; readonly remaining: number } | null;
  readonly updatedAt: string;
  readonly stale: boolean;
}

const useApiUsageOpen = () =>
  useLocalStorage<boolean, boolean>("atlas:api-usage-open", true, Schema.Boolean);

async function fetchApiUsage(): Promise<ReadonlyArray<ApiUsage> | null> {
  try {
    const token = await readDesktopPrimaryBearerToken();
    const response = await fetch(resolvePrimaryEnvironmentHttpUrl("/api/atlas/api-usage"), {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    return response.ok ? ((await response.json()) as ReadonlyArray<ApiUsage>) : null;
  } catch {
    return null;
  }
}

export function AtlasApiUsageToggle() {
  const [open, setOpen] = useApiUsageOpen();
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="flex shrink-0" />}>
        <Toggle
          className="shrink-0 [-webkit-app-region:no-drag]"
          pressed={open}
          onPressedChange={setOpen}
          aria-label="Toggle API quotas"
          data-atlas="A32"
          variant="ghost"
          size="sm"
        >
          <GaugeIcon className="size-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipPopup side="bottom">Toggle API quotas</TooltipPopup>
    </Tooltip>
  );
}

export function AtlasApiUsagePanel() {
  const [open] = useApiUsageOpen();
  if (!open) return null;
  return (
    // Sits in the gutter right of the composer; the container query hides it when no gutter is left.
    <div className="@container pointer-events-none absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] left-[calc(50%+var(--chat-content-max-width)/2+0.75rem)]">
      <ApiUsageCard />
    </div>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function ApiUsageCard() {
  const [entries, setEntries] = useState<ReadonlyArray<ApiUsage> | null>(null);
  const now = Date.parse(`${useNowMinute()}:00Z`);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- relit les relevés écrits sur le disque par les scripts
  useEffect(() => {
    let alive = true;
    const load = () => void fetchApiUsage().then((next) => alive && setEntries(next));
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (entries === null) return null;
  return (
    <div
      data-atlas="A32"
      className="dropdown-glass pointer-events-auto ml-auto flex w-44 flex-col gap-1 rounded-2xl p-1.5 @max-[11rem]:hidden"
    >
      {entries.length === 0 ? (
        <p className="px-1.5 text-2xs text-muted-foreground">No API calls recorded yet</p>
      ) : (
        entries.map((entry) => {
          const used = Math.round(((entry.limit - entry.remaining) / entry.limit) * 100);
          return (
            <Tooltip key={entry.label}>
              <TooltipTrigger
                render={
                  <div
                    tabIndex={0}
                    aria-label={`${entry.label}: ${entry.remaining} of ${entry.limit} calls left today`}
                    className="flex cursor-default flex-col gap-1 rounded-lg px-1.5 py-1 text-2xs tabular-nums outline-none hover:bg-black/[0.035] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset dark:hover:bg-white/[0.08]"
                  />
                }
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-muted-foreground">{entry.label}</span>
                  <span
                    className={cn(
                      "shrink-0 font-medium",
                      used >= 90
                        ? "text-error-foreground"
                        : used >= 80
                          ? "text-warning-foreground"
                          : "text-foreground/80",
                    )}
                  >
                    {compact.format(entry.remaining)} / {compact.format(entry.limit)}
                  </span>
                </span>
                <span className="relative h-[3px] rounded-full bg-muted-foreground/30 dark:bg-muted-foreground/20">
                  {used > 0 ? (
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full",
                        used >= 90 ? "bg-error" : used >= 80 ? "bg-warning" : "bg-foreground/80",
                      )}
                      style={{ width: `max(${used}%, 6px)` }}
                    />
                  ) : null}
                </span>
              </TooltipTrigger>
              <TooltipPopup side="left" sideOffset={12}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground">
                    {entry.label}: {entry.remaining.toLocaleString("en-US")} of{" "}
                    {entry.limit.toLocaleString("en-US")} calls left today
                  </span>
                  {entry.perSecond ? (
                    <span className="text-muted-foreground">
                      Up to {entry.perSecond.limit} calls per second
                    </span>
                  ) : null}
                  <span className="text-muted-foreground">
                    Last call {formatDuration(now - Date.parse(entry.updatedAt))} ago
                  </span>
                </div>
              </TooltipPopup>
            </Tooltip>
          );
        })
      )}
    </div>
  );
}
