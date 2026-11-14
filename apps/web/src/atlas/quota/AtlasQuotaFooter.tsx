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
              <span className="min-w-0 flex-1 truncate text-xs">{name}</span>
              {/* 5 h en grand, semaine en petit dessous */}
              <span className="flex w-16 shrink-0 flex-col gap-0.5">
                <span className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      (fiveHours ?? 0) >= 90 ? "bg-error" : "bg-sidebar-foreground/70",
                    )}
                    style={{ width: `${fiveHours ?? 0}%` }}
                  />
                </span>
                <span className="relative h-0.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      (week ?? 0) >= 90 ? "bg-error" : "bg-sidebar-foreground/40",
                    )}
                    style={{ width: `${week ?? 0}%` }}
                  />
                </span>
              </span>
              <span className="flex w-9 shrink-0 flex-col items-end leading-none">
                <span>{fiveHours === null ? "·" : `${fiveHours}%`}</span>
                <span className="text-3xs opacity-60">{week === null ? "·" : `${week}%`}</span>
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
    </div>
  );
}
