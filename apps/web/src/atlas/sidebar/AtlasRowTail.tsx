// [Atlas] A16 : fin de ligne de la barre Atlas : mini barre du cache, temps, icône d'état (ou cache chaud).
import { FlameIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import type { SidebarThreadSummary } from "../../types";
import { atlasThreadCacheTtlMs, atlasThreadCacheLeftMs } from "../cache/threadCache";

export function AtlasRowTail(props: {
  thread: SidebarThreadSummary;
  time: ReactNode;
  // Icône de l'état de T3 (Working, Approval…), déjà colorée ; null quand la session est au repos.
  status: ReactNode;
  statusLabel: string | null;
}) {
  const nowMinute = useNowMinute();
  const left = atlasThreadCacheLeftMs(props.thread, Date.parse(`${nowMinute}:00Z`));
  const ttl = atlasThreadCacheTtlMs(props.thread);
  const minutes = Math.ceil(left / 60_000);
  return (
    <span data-atlas="A16" className="inline-flex items-center gap-1.5 text-xs">
      {left > 0 ? (
        <span
          aria-label={`Estimated cache warmth: ${minutes} min`}
          role="img"
          className="relative h-1 w-5 overflow-hidden rounded-full bg-muted"
        >
          <span
            className={
              left > ttl / 3
                ? "absolute inset-y-0 left-0 rounded-full bg-success"
                : "absolute inset-y-0 left-0 rounded-full bg-warning"
            }
            style={{ width: `${(left / ttl) * 100}%` }}
          />
        </span>
      ) : null}
      {props.time}
      <span
        className="inline-flex w-3 justify-center"
        aria-label={props.statusLabel ?? (left > 0 ? "Cache warm" : undefined)}
      >
        {props.status ??
          (left > 0 ? <FlameIcon aria-hidden className="size-3 text-warning" /> : null)}
      </span>
    </span>
  );
}
