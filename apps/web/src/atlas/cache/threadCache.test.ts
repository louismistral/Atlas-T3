// [Atlas] A16 : les conversations Codex récentes restent visibles dans Cache warm dix minutes.
import { describe, expect, it } from "vite-plus/test";
import { atlasThreadCacheLeftMs, atlasThreadCacheTtlMs } from "./threadCache";
import type { SidebarThreadSummary } from "../../types";

describe("sidebar cache estimate", () => {
  it("tracks new and active Codex threads for ten minutes", () => {
    const start = Date.parse("2026-01-01T12:00:00Z");
    const thread = {
      modelSelection: { instanceId: "codex" },
      createdAt: new Date(start).toISOString(),
      latestUserMessageAt: null,
      latestRun: null,
    } as SidebarThreadSummary;
    expect(atlasThreadCacheTtlMs(thread)).toBe(600_000);
    expect(atlasThreadCacheLeftMs(thread, start + 300_000)).toBe(300_000);
    expect(atlasThreadCacheLeftMs(thread, start + 600_000)).toBe(0);
    expect(
      atlasThreadCacheLeftMs(
        { ...thread, latestUserMessageAt: new Date(start + 500_000).toISOString() },
        start + 600_000,
      ),
    ).toBe(500_000);
  });
});
