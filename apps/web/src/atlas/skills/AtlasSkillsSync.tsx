// [Atlas] A25 : état de synchronisation des skills claude.ai dans le panneau des détails de session.
// Le serveur compare les zips de « 00 - Skills transfer » à la copie locale de claude.ai et supprime
// ceux qui sont importés ; ici on montre ce qui reste à faire.
import { useEffect, useState } from "react";

import { ThreadDetailsSection } from "../../components/chat/ThreadDetailsSection";
import { readDesktopPrimaryBearerToken } from "../../environments/primary/desktopAuth";
import { resolvePrimaryEnvironmentHttpUrl } from "../../environments/primary/target";
import { cn } from "../../lib/utils";

interface Report {
  readonly zips: ReadonlyArray<{
    readonly name: string;
    readonly status: "pending" | "diverged" | "unknown";
    readonly activeAccount: boolean;
  }>;
  readonly changedWithoutZip: ReadonlyArray<string>;
}

const STATUS = {
  pending: { label: "Zip to import", tone: "text-warning" },
  diverged: { label: "Diverged, merge", tone: "text-error" },
  unknown: { label: "Unknown skill", tone: "text-muted-foreground" },
  changed: { label: "Changed, no zip", tone: "text-warning" },
} as const;

async function fetchReport(): Promise<Report | null> {
  try {
    const token = await readDesktopPrimaryBearerToken();
    const response = await fetch(resolvePrimaryEnvironmentHttpUrl("/api/atlas/skills-sync"), {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    return response.ok ? ((await response.json()) as Report) : null;
  } catch {
    return null;
  }
}

export function AtlasSkillsSync() {
  const [report, setReport] = useState<Report | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- relit l'état des skills sur le disque toutes les minutes
  useEffect(() => {
    let alive = true;
    const load = () => void fetchReport().then((next) => alive && setReport(next));
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (report === null) return null;
  const rows = [
    ...report.zips.map((zip) => ({
      name: zip.name,
      ...STATUS[zip.status],
      other: !zip.activeAccount,
    })),
    ...report.changedWithoutZip.map((name) => ({ name, ...STATUS.changed, other: false })),
  ];
  return (
    <ThreadDetailsSection headingId="atlas-skills-sync-heading" title="Skills sync">
      <div className="flex flex-col gap-0.5 px-2.5 text-xs">
        {rows.length === 0 ? (
          <span className="text-muted-foreground">claude.ai skills in sync</span>
        ) : (
          rows.map((row) => (
            <div
              key={`${row.name}:${row.label}`}
              className="flex items-center justify-between gap-3"
            >
              <span className={cn("truncate", row.other && "text-muted-foreground")}>
                {row.name}
              </span>
              <span
                className={cn("shrink-0 text-2xs", row.other ? "text-muted-foreground" : row.tone)}
              >
                {row.other ? "Other account" : row.label}
              </span>
            </div>
          ))
        )}
      </div>
    </ThreadDetailsSection>
  );
}
