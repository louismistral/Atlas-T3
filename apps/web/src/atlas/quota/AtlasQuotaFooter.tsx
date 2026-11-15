// [Atlas] A3 : quotas de chaque compte connecté en bas à gauche de la barre, toujours visibles (comme Atlas).
import { useAtomValue } from "@effect/atom-react";
import type { ServerProviderUsageWindow } from "@t3tools/contracts";
import { collectLimitAccounts, formatResetsIn } from "@t3tools/shared/usageLimits";
import { useNavigate } from "@tanstack/react-router";

import { ProviderInstanceIcon } from "../../components/chat/ProviderInstanceIcon";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";
import { useNowMinute } from "../../hooks/useNowMinute";
import { cn } from "../../lib/utils";
import { environmentPresentations } from "../../state/presentation";
import { weekPace } from "./weekPace";

const used = (window: ServerProviderUsageWindow | undefined) =>
  window === undefined ? null : Math.round(Math.max(0, Math.min(100, window.usedPercent)));

export function AtlasQuotaFooter() {
  const presentations = useAtomValue(environmentPresentations.presentationsWithProvidersAtom);
  const nowMinute = useNowMinute();
  const navigate = useNavigate();
  const now = Date.parse(`${nowMinute}:00Z`);
  const accounts = collectLimitAccounts(presentations).filter(
    (account) => account.limits.windows.length > 0,
  );
  if (accounts.length === 0) return null;
  return (
    <div data-atlas="A3" className="flex flex-col gap-0.5 px-1 pb-1">
      {accounts.map((account) => {
        const session = account.limits.windows.find((w) => w.kind === "session");
        const weekly = account.limits.windows.find((w) => w.kind === "weekly");
        const fiveHours = used(session);
        const week = used(weekly);
        const name = account.displayName ?? account.email ?? account.driver;
        return (
          <Tooltip key={account.key}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/usage" })}
                  className="flex h-7 w-full cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-2xs text-sidebar-muted-foreground tabular-nums hover:bg-sidebar-row-hover hover:text-sidebar-foreground"
                />
              }
            >
              <ProviderInstanceIcon
                driverKind={account.driver}
                displayName={name}
                accentColor={account.accentColor}
                size="compact"
              />
              <span className="w-16 min-w-0 shrink truncate text-xs">{name}</span>
              {/* 5 h : longue barre et son % ; semaine : barre courte et son % */}
              <span className="relative h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    (fiveHours ?? 0) >= 90 ? "bg-error" : "bg-sidebar-foreground/70",
                  )}
                  style={{ width: `${fiveHours ?? 0}%` }}
                />
              </span>
              <span className="w-7 shrink-0 text-right">
                {fiveHours === null ? "·" : `${fiveHours}%`}
              </span>
              <span className="relative h-1 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full",
                    (week ?? 0) >= 90 ? "bg-error" : "bg-sidebar-foreground/50",
                  )}
                  style={{ width: `${week ?? 0}%` }}
                />
              </span>
              <span className="w-7 shrink-0 text-right opacity-70">
                {week === null ? "·" : `${week}%`}
              </span>
            </TooltipTrigger>
            <TooltipPopup side="right">
              {[session, weekly]
                .filter((w): w is ServerProviderUsageWindow => w !== undefined)
                .map(
                  (w) =>
                    `${w.label}: ${used(w)}% used${formatResetsIn(w, now) ? `, ${formatResetsIn(w, now)}` : ""}`,
                )
                .join(" · ")}
            </TooltipPopup>
          </Tooltip>
        );
      })}
      <WeekPaceBar accounts={accounts} now={now} />
    </div>
  );
}

// Somme des quotas semaine (0 → 100 × comptes), repère = part de la semaine écoulée depuis vendredi.
function WeekPaceBar({
  accounts,
  now,
}: {
  accounts: ReturnType<typeof collectLimitAccounts>;
  now: number;
}) {
  const weeks = accounts
    .map((a) => used(a.limits.windows.find((w) => w.kind === "weekly")))
    .filter((w): w is number => w !== null);
  if (weeks.length === 0) return null;
  const { total, max, elapsed, delta } = weekPace(weeks, now);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex h-4 items-center gap-2 px-1.5 text-2xs text-sidebar-muted-foreground tabular-nums" />
        }
      >
        <span className="relative h-1 flex-1 rounded-full bg-muted">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-sidebar-foreground/50"
            style={{ width: `${(total / max) * 100}%` }}
          />
          <span
            className="absolute -inset-y-0.5 w-px bg-sidebar-foreground"
            style={{ left: `${elapsed * 100}%` }}
          />
        </span>
        <span className={cn("w-7 shrink-0 text-right", delta > 0 && "text-error")}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      </TooltipTrigger>
      <TooltipPopup side="right">
        {`Semaine : ${total} / ${max} % utilisés, ${Math.round(elapsed * 100)} % de la semaine écoulée (depuis vendredi). ${delta > 0 ? `${delta} pts d'avance sur le rythme` : `${-delta} pts de marge`}`}
      </TooltipPopup>
    </Tooltip>
  );
}
