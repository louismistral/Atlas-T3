// [Atlas] A30 : choisir l'effort d'une tâche planifiée, avec le même sélecteur que le composer.
import type { ModelSelection, ProviderInstanceId } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { TraitsPicker } from "../../components/chat/TraitsPicker";
import type { ProviderInstanceEntry } from "../../providerInstances";

/** Les options (effort…) de la sélection gardée, seulement si elle vise ce modèle : un autre modèle repart de son défaut. */
export function scheduledTaskModelOptions(
  base: ModelSelection | null,
  instanceId: ProviderInstanceId,
  model: string,
): NonNullable<ModelSelection["options"]> {
  return base && base.instanceId === instanceId && base.model === model ? (base.options ?? []) : [];
}

export function ScheduledTaskEffortPicker(props: {
  entry: ProviderInstanceEntry | undefined;
  model: string;
  base: ModelSelection | null;
  triggerClassName?: string;
  onBaseChange: (next: ModelSelection) => void;
}) {
  const { entry, model, base } = props;
  if (!entry || !model) return null;
  return (
    <span data-atlas="A30">
      <TraitsPicker
        provider={entry.driverKind}
        models={entry.models}
        model={model}
        modelOptions={scheduledTaskModelOptions(base, entry.instanceId, model)}
        allowPromptInjectedEffort={false}
        {...(props.triggerClassName ? { triggerClassName: props.triggerClassName } : {})}
        onModelOptionsChange={(options) =>
          props.onBaseChange(createModelSelection(entry.instanceId, model, options))
        }
      />
    </span>
  );
}
