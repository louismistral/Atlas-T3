// [Atlas] A23 : boutons « diviser » dans l'en-tête de la session, à côté du bouton des détails.
// Fichier à part : AtlasPanes importe ChatView, qui affiche ces boutons.
import { Columns2Icon, Rows2Icon } from "lucide-react";
import { createContext, use, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Button } from "../../components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../../components/ui/tooltip";

// Les actions de la zone qui contient la vue, lues par les boutons de l'en-tête de la session.
export const PaneActionsContext = createContext<{
  readonly split: (dir: "row" | "col") => void;
} | null>(null);

// La barre du haut commune des zones ; `undefined` : une seule zone, l'en-tête reste à sa place.
export const TopBarContext = createContext<HTMLElement | null | undefined>(undefined);

/** L'en-tête de la session : à sa place, ou dans la barre du haut commune quand il y a plusieurs zones. */
export function AtlasTopBarHeader(props: ComponentProps<"header">) {
  const topBar = use(TopBarContext);
  const header = <header {...props} />;
  if (topBar === undefined) return header;
  return topBar === null ? null : createPortal(header, topBar);
}

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
