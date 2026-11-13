// [Atlas] A3 : get_usage ne répond pas à un jeton setup-token ; « unsupported » ferait ignorer les
// limites reçues en conversation. Disponible, vide et daté de 1970 : elles le remplissent, et une
// sonde suivante vide ne les efface pas (resolveUsageLimitsAfterProbe garde le plus récent).
import type { ServerProviderUsageLimits } from "@t3tools/contracts";
import { makeUsageLimits } from "@t3tools/provider-core/server/usageLimits";

export function atlasTokenAccountUsageLimits(capabilities: {
  readonly tokenSource: string | undefined;
  readonly usage?: { readonly rate_limits_available?: boolean } | undefined;
}): ServerProviderUsageLimits | undefined {
  if (capabilities.tokenSource !== "CLAUDE_CODE_OAUTH_TOKEN") return undefined;
  if (capabilities.usage?.rate_limits_available) return undefined;
  return makeUsageLimits({ checkedAt: "1970-01-01T00:00:00.000Z", windows: [] });
}
