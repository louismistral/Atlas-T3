// [Atlas] A3 : get_usage ne répond pas à un jeton setup-token ; « unsupported » ferait ignorer les
// limites reçues en conversation. Disponible, vide et daté de 1970 : elles le remplissent, et une
// sonde suivante vide ne les efface pas (resolveUsageLimitsAfterProbe garde le plus récent).
import type {
  ProviderUsageLimitsUpdate,
  ServerProviderUsageLimits,
  ServerProviderUsageWindow,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import { makeUsageLimits } from "@t3tools/provider-core/server/usageLimits";

export function atlasTokenAccountUsageLimits(capabilities: {
  readonly tokenSource: string | undefined;
  readonly usage?: { readonly rate_limits_available?: boolean } | undefined;
}): ServerProviderUsageLimits | undefined {
  if (capabilities.tokenSource !== "CLAUDE_CODE_OAUTH_TOKEN") return undefined;
  if (capabilities.usage?.rate_limits_available) return undefined;
  return makeUsageLimits({ checkedAt: "1970-01-01T00:00:00.000Z", windows: [] });
}

const UNIFIED_WINDOWS = {
  five_hour: { kind: "session", label: "Session", windowDurationMins: 5 * 60 },
  seven_day: { kind: "weekly", label: "Weekly", windowDurationMins: 7 * 24 * 60 },
} as const;

type UnifiedWindow = { readonly utilization?: number; readonly resetsAt?: number };

// [Atlas] A3 : le CLI met les pourcentages (0-1) dans `unifiedWindows`, que T3 ne lit pas.
export function atlasUnifiedWindowsUpdate(info: unknown): ProviderUsageLimitsUpdate | undefined {
  const unified = (info as { readonly unifiedWindows?: Record<string, UnifiedWindow> })
    ?.unifiedWindows;
  if (!unified) return undefined;
  const windows: ServerProviderUsageWindow[] = [];
  for (const [id, shape] of Object.entries(UNIFIED_WINDOWS)) {
    const w = unified[id];
    if (typeof w?.utilization !== "number") continue;
    const dt = typeof w.resetsAt === "number" ? DateTime.make(w.resetsAt * 1000) : Option.none();
    windows.push({
      id,
      ...shape,
      usedPercent: Math.max(0, Math.min(100, w.utilization * 100)),
      ...(Option.isSome(dt) ? { resetsAt: DateTime.formatIso(dt.value) } : {}),
    });
  }
  return windows.length > 0 ? { windows } : undefined;
}
