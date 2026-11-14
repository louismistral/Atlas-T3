// [Atlas] A4 : cumule les jetons de chaque appel d'un tour Claude (fil principal) pour la barre du cache.
// Chaque message a un usage cumulatif (message_start puis message_delta) : on garde le dernier par message.
import type { AtlasTurnTokens } from "@t3tools/contracts";

interface ClaudeUsage {
  readonly input_tokens: number;
  readonly cache_creation_input_tokens?: number | null;
  readonly cache_read_input_tokens?: number | null;
  readonly cache_creation?: {
    readonly ephemeral_1h_input_tokens: number;
    readonly ephemeral_5m_input_tokens: number;
  } | null;
  readonly output_tokens: number;
}

// Clé : le contexte du tour en cours ; il disparaît avec le tour.
const callsByTurn = new WeakMap<object, Map<string, ClaudeUsage>>();

export function atlasClaudeTurnTokens(
  turn: object,
  messageId: string | undefined,
  usage: ClaudeUsage | undefined,
): { atlasTurn: AtlasTurnTokens } | Record<string, never> {
  let calls = callsByTurn.get(turn);
  if (!calls) {
    calls = new Map();
    callsByTurn.set(turn, calls);
  }
  if (messageId !== undefined && usage !== undefined) calls.set(messageId, usage);
  if (calls.size === 0) return {};
  const total = { calls: calls.size, uncached: 0, read: 0, write5m: 0, write1h: 0, output: 0 };
  for (const call of calls.values()) {
    const written = call.cache_creation_input_tokens ?? 0;
    const write1h = Math.min(written, call.cache_creation?.ephemeral_1h_input_tokens ?? 0);
    total.uncached += call.input_tokens;
    total.read += call.cache_read_input_tokens ?? 0;
    total.write1h += write1h;
    total.write5m += written - write1h;
    total.output += call.output_tokens;
  }
  return { atlasTurn: total };
}
