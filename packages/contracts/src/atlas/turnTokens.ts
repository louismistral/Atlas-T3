// [Atlas] A4 : jetons cumulés du tour (tous les appels du fil principal), pour la barre du cache.
import * as Schema from "effect/Schema";

import { NonNegativeInt } from "../baseSchemas.ts";

export const AtlasTurnTokens = Schema.Struct({
  calls: NonNegativeInt,
  // Entrée lue sans cache, relue du cache, écrite dans le cache (5 min, 1 h), produite.
  uncached: NonNegativeInt,
  read: NonNegativeInt,
  write5m: NonNegativeInt,
  write1h: NonNegativeInt,
  output: NonNegativeInt,
});
export type AtlasTurnTokens = typeof AtlasTurnTokens.Type;
