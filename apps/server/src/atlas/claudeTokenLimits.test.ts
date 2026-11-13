// [Atlas] A3 : les limites d'un compte par jeton se remplissent en conversation et survivent à la sonde suivante.
import {
  applyUsageLimitsUpdate,
  resolveUsageLimitsAfterProbe,
} from "@t3tools/provider-core/server/usageLimits";
import { expect, it } from "vite-plus/test";

import { atlasTokenAccountUsageLimits } from "./claudeTokenLimits.ts";

const session = {
  id: "five_hour",
  kind: "session",
  label: "Session",
  windowDurationMins: 300,
  usedPercent: 12,
} as const;

it("un compte par jeton reçoit ses limites en conversation et les garde", () => {
  const probe = { tokenSource: "CLAUDE_CODE_OAUTH_TOKEN", usage: { rate_limits_available: false } };
  const empty = atlasTokenAccountUsageLimits(probe);
  expect(empty?.unavailable).toBeUndefined();
  const filled = applyUsageLimitsUpdate({
    previous: empty,
    update: { windows: [session] },
    checkedAt: "2026-11-13T22:00:00.000Z",
  });
  expect(filled?.unavailable).toBeUndefined();
  expect(filled?.windows.map((w) => w.usedPercent)).toEqual([12]);
  const afterProbe = resolveUsageLimitsAfterProbe({
    published: filled,
    probed: atlasTokenAccountUsageLimits(probe),
  });
  expect(afterProbe?.windows.map((w) => w.usedPercent)).toEqual([12]);
});

it("ne touche pas aux autres comptes", () => {
  expect(
    atlasTokenAccountUsageLimits({
      tokenSource: "claude.ai",
      usage: { rate_limits_available: false },
    }),
  ).toBeUndefined();
  expect(
    atlasTokenAccountUsageLimits({
      tokenSource: "CLAUDE_CODE_OAUTH_TOKEN",
      usage: { rate_limits_available: true },
    }),
  ).toBeUndefined();
});
