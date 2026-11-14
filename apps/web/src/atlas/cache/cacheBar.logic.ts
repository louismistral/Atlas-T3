// [Atlas] A4 : calculs de la barre du cache (logique pure, testée).
import type { AtlasTurnTokens, OrchestrationV2ProviderTurn } from "@t3tools/contracts";

type Turn = Pick<OrchestrationV2ProviderTurn, "tokenUsage" | "model">;
type Usage = NonNullable<Turn["tokenUsage"]>;

/** Le tour le plus récent qui a des jetons. */
export function latestUsageTurn(
  turns: readonly Turn[],
): { usage: Usage; model: string | null } | null {
  let best: { usage: Usage; model: string | null } | null = null;
  for (const turn of turns) {
    const usage = turn.tokenUsage;
    if (usage === undefined) continue;
    if (best === null || Date.parse(usage.updatedAt) >= Date.parse(best.usage.updatedAt)) {
      best = { usage, model: turn.model ?? null };
    }
  }
  return best;
}

/** Totaux du tour ; sans cumul du serveur (Codex, ancien tour), ceux du dernier appel. */
export function turnTokens(usage: Usage): AtlasTurnTokens {
  if (usage.atlasTurn) return usage.atlasTurn;
  const read = usage.cachedInputTokens ?? 0;
  return {
    calls: 1,
    uncached: Math.max(0, (usage.inputTokens ?? 0) - read),
    read,
    write5m: 0,
    write1h: 0,
    output: usage.outputTokens ?? 0,
  };
}

// Tarifs API en $ par million de jetons : entrée, relecture du cache, sortie. Écrire coûte 1,25× l'entrée
// (cache de 5 min) ou 2× (1 h). Indicateur seulement : l'abonnement n'est pas facturé en dollars.
// shortcut: tarifs recopiés d'Atlas (11 nov. 2026) ; un modèle absent n'a pas d'équivalent en dollars.
const PRICES: Record<string, readonly [number, number, number]> = {
  "claude-opus-5-5": [4, 0.2, 20],
  "claude-sonnet-5-5": [2, 0.1, 10],
  "claude-haiku-5-5": [0.1, 0.01, 0.5],
  "claude-fable-5-1": [10, 0.25, 50],
  "claude-fable-5-2": [8, 0.2, 40],
};

export function apiCostUsd(model: string | null, t: AtlasTurnTokens): number | null {
  const key = model === null ? undefined : Object.keys(PRICES).find((id) => model.startsWith(id));
  if (key === undefined) return null;
  const [input, read, output] = PRICES[key]!;
  // Haiku 5.5 coûte 5× plus cher quand un appel dépasse 100k jetons (approché sur la moyenne du tour).
  const perCall = (t.uncached + t.read + t.write5m + t.write1h) / Math.max(1, t.calls);
  const factor = key === "claude-haiku-5-5" && perCall > 100_000 ? 5 : 1;
  return (
    (factor *
      (t.uncached * input +
        t.write5m * 1.25 * input +
        t.write1h * 2 * input +
        t.read * read +
        t.output * output)) /
    1e6
  );
}

export const formatTokens = (n: number) =>
  n >= 999_500 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

export const formatCountdown = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const formatUsd = (usd: number) => (usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`);
