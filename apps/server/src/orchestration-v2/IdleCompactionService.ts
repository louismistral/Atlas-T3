import {
  atlasCacheMode, // [Atlas] A24
  ATLAS_CACHE_WARM_TEXT,
  atlasWarmCount,
  atlasWarmQuietHour,
  atlasWarmTag,
  CommandId,
  IDLE_COMPACTION_TEXT,
  MessageId,
  resolveProjectProviderInstanceEnabled,
  type RunId,
  type ThreadId,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as FiberMap from "effect/FiberMap";
import * as Stream from "effect/Stream";

import { forkParked } from "../serverActivation.ts";
import * as ServerSettings from "../serverSettings.ts";
import { idleCompactionWindow } from "./IdleCompaction.ts";
import * as Orchestrator from "./Orchestrator.ts";
import * as ProjectionStore from "./ProjectionStore.ts";

/**
 * Beta: when a run completes on a Claude instance set to compact before the
 * cache expires, waits until shortly before its prompt cache expires and sends
 * `/compact` as a visible T3 Code turn. Timers live in
 * memory, so a server restart skips compactions that were still waiting.
 */
export const make = Effect.gen(function* () {
  const orchestrator = yield* Orchestrator.OrchestratorV2;
  const projections = yield* ProjectionStore.ProjectionStoreV2;
  const settings = yield* ServerSettings.ServerSettingsService;

  const compactWhenDue = Effect.fn("IdleCompactionService.compactWhenDue")(
    function* (threadId: ThreadId, completedRunId: RunId) {
      let runId = completedRunId;
      // Loops after the wait or a retarget: the thread may have moved on.
      while (true) {
        const current = yield* settings.getSettings;
        const thread = yield* projections.getThread(threadId);
        const claudeInstance = Object.hasOwn(current.providerInstances, thread.providerInstanceId)
          ? current.providerInstances[thread.providerInstanceId]?.driver === "claudeAgent"
          : thread.providerInstanceId === "claudeAgent";
        // [Atlas] A24 : le mode de la session (tag) remplace le réglage global ; par défaut on compacte
        const mode = atlasCacheMode(thread.tags);
        if (
          !claudeInstance ||
          mode === "off" ||
          !resolveProjectProviderInstanceEnabled(
            current,
            thread.projectId,
            thread.providerInstanceId,
          )
        )
          return;
        const activeProviderThreadIds =
          thread.activeProviderThreadId === null ? [] : [thread.activeProviderThreadId];
        const records = yield* projections.getThreadRecords(
          threadId,
          [
            "runs",
            "messages",
            "providerThreads",
            "providerTurns",
            "runtimeRequests",
            "turnItems",
            "contextTransfers",
          ],
          {
            messageRunIds: [runId],
            turnItemStatuses: ["pending", "running", "waiting"],
            // The latest run, active runs that hold background work, and rolled-back runs whose
            // items it ignores.
            runStatuses: ["preparing", "starting", "running", "rolled_back"],
            includeLatestRun: true,
            // Without an active provider thread there is no session to compact.
            providerThreadIds: activeProviderThreadIds,
            providerTurnThreadIds: activeProviderThreadIds,
            latestProviderTurnUsageOnly: true,
            runtimeRequestStatuses: ["pending"],
            contextTransferStatuses: ["pending"],
          },
        );
        if (
          atlasCacheMode(records.thread.tags) !== mode || // [Atlas] A24
          !resolveProjectProviderInstanceEnabled(
            current,
            records.thread.projectId,
            records.thread.providerInstanceId,
          )
        )
          return;
        const latestRun = records.runs
          .filter((run) => run.status !== "cancelled" || run.startedAt !== null)
          .reduce<(typeof records.runs)[number] | undefined>(
            (latest, run) => (latest === undefined || run.ordinal > latest.ordinal ? run : latest),
            undefined,
          );
        // A late update for an earlier run replaced the latest run's timer, so take it over.
        if (latestRun?.status === "completed" && latestRun.id !== runId) {
          runId = latestRun.id;
          continue;
        }
        // [Atlas] A24 : un tour qui ne vient pas du maintien du cache remet le compteur de relances à zéro
        let warmCount = atlasWarmCount(records.thread.tags);
        const userText = records.messages.find(
          (message) => message.id === latestRun?.userMessageId,
        )?.text;
        if (warmCount > 0 && userText !== undefined && userText !== ATLAS_CACHE_WARM_TEXT) {
          yield* orchestrator.dispatch({
            type: "thread.tag.set",
            commandId: CommandId.make(`server:atlas-warm-reset:${threadId}:${runId}`),
            threadId,
            tag: atlasWarmTag(warmCount),
            tagged: false,
          });
          warmCount = 0;
        }
        const nowMs = DateTime.toEpochMillis(yield* DateTime.now);
        // [Atlas] A24 : compacter seulement au-delà de 200K de contexte ; garder chaud quelle que soit la taille
        const window = idleCompactionWindow(records, nowMs, mode === "warm" ? 0 : 200_000);
        if (window?.runId !== runId) return;
        if (nowMs < window.startMs) {
          yield* Effect.sleep(Duration.millis(window.startMs - nowMs));
          continue;
        }
        // [Atlas] A24 : garder chaud = un petit message qui relance le cache, au lieu de /compact
        if (mode === "warm") {
          // La nuit (00h-08h), on laisse le cache expirer ; il ne repart pas tout seul le matin.
          if (atlasWarmQuietHour(nowMs)) return;
          // Compteur de relances d'affilée, affiché à la place de la flamme
          for (const [tag, tagged] of [
            ...(warmCount > 0 ? [[atlasWarmTag(warmCount), false] as const] : []),
            [atlasWarmTag(warmCount + 1), true] as const,
          ]) {
            yield* orchestrator.dispatch({
              type: "thread.tag.set",
              commandId: CommandId.make(`server:atlas-warm-count:${threadId}:${runId}:${tag}`),
              threadId,
              tag,
              tagged,
            });
          }
          yield* orchestrator.dispatch({
            type: "message.dispatch",
            commandId: CommandId.make(`server:atlas-warm:${threadId}:${runId}`),
            messageId: MessageId.make(`atlas-warm:${threadId}:${runId}`),
            threadId,
            text: ATLAS_CACHE_WARM_TEXT,
            attachments: [],
            createdBy: "agent",
            creationSource: "server",
            dispatchMode: { type: "start_immediately" },
          });
          return;
        }
        yield* orchestrator.dispatch({
          type: "message.dispatch",
          // One compaction per completed run, even across duplicate events.
          commandId: CommandId.make(`server:idle-compact:${threadId}:${runId}`),
          messageId: MessageId.make(`idle-compact:${threadId}:${runId}`),
          threadId,
          text: IDLE_COMPACTION_TEXT,
          attachments: [],
          createdBy: "agent",
          creationSource: "server",
          idleCompaction: "beforeCacheExpires",
          dispatchMode: { type: "start_immediately" },
        });
        return;
      }
    },
    (effect, threadId) =>
      effect.pipe(
        Effect.catch((cause) => Effect.logWarning("idle compaction skipped", { threadId, cause })),
      ),
  );

  const start = Effect.fn("IdleCompactionService.start")(function* () {
    // Keyed by thread: a newer completed run replaces the waiting timer.
    const timers = yield* FiberMap.make<ThreadId>();
    yield* forkParked(
      Stream.runForEach(orchestrator.streamDomainEvents, (event) =>
        event.type === "run.updated" && event.payload.status === "completed"
          ? FiberMap.run(timers, event.threadId, compactWhenDue(event.threadId, event.payload.id))
          : Effect.void,
      ),
    );
  });
  return { start };
});
