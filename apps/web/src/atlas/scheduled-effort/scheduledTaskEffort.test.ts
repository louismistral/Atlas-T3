// @effect-diagnostics nodeBuiltinImport:off - lit le formulaire de T3.
// [Atlas] A30 : l'effort d'une tâche planifiée se choisit dans le formulaire.
import * as NodeFS from "node:fs";
import { ProviderInstanceId } from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";
import { scheduledTaskModelOptions } from "./ScheduledTaskEffortPicker";

const codex = ProviderInstanceId.make("codex");
const high = [{ id: "reasoningEffort", value: "high" }];

it("garde l'effort du même modèle, repart du défaut sur un autre", () => {
  const base = { instanceId: codex, model: "gpt-6.2-sol", options: high };
  expect(scheduledTaskModelOptions(base, codex, "gpt-6.2-sol")).toEqual(high);
  expect(scheduledTaskModelOptions(base, codex, "gpt-5.4")).toEqual([]);
  expect(scheduledTaskModelOptions(null, codex, "gpt-6.2-sol")).toEqual([]);
});

it("le formulaire des tâches planifiées affiche le sélecteur d'effort", () => {
  const form = NodeFS.readFileSync(
    new URL("../../components/settings/ScheduledTasksSettings.tsx", import.meta.url),
    "utf8",
  );
  expect(form).toContain("<ScheduledTaskEffortPicker");
});
