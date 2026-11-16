// [Atlas] A23 : boutons « diviser » dans l'en-tête de la session, à côté du bouton des détails.
// Fichier à part : AtlasPanes importe ChatView, qui affiche ces boutons.
import { Columns2Icon, Rows2Icon } from "lucide-react";
import { createContext, use, type ReactNode } from "react";

import { Button } from "../../components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";

// Les actions de la zone qui contient la vue, lues par les boutons de l'en-tête de la session.
export const PaneActionsContext = createContext<{
  readonly split: (dir: "row" | "col") => void;
} | null>(null);

/** Diviser à droite / en bas, à côté du bouton des détails de la session ; rien hors des zones. */
export function AtlasPaneButtons() {
  const actions = use(PaneActionsContext);
  if (actions === null) return null;
  return (
    <>
      <HeaderButton label="Split right" onClick={() => actions.split("row")}>
        <Columns2Icon className="size-4" />
      </HeaderButton>
      <HeaderButton label="Split down" onClick={() => actions.split("col")}>
        <Rows2Icon className="size-4" />
      </HeaderButton>
    </>
  );
}

function HeaderButton(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={props.label}
            onClick={props.onClick}
            className="shrink-0 [-webkit-app-region:no-drag]"
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipPopup side="bottom">{props.label}</TooltipPopup>
    </Tooltip>
  );
}
