// [Atlas] A28 : un chemin Windows avec espaces dans ![](…) ou [](…) n'est ni une image ni un lien pour CommonMark
// sans chevrons. On les ajoute avant l'analyse (hors blocs de code) ; la suite de T3 gère déjà les chemins Windows.
// shortcut: pas de parenthèse dans le chemin, pas de titre "…" ; un exemple de syntaxe en code inline serait aussi réécrit.

const SPACED_DRIVE_DESTINATION = /(!?\[[^\]\n]*\])\((\/?[A-Za-z]:[\\/][^()<>\n]*?\s[^()<>\n]*)\)/g;

export function wrapSpacedWindowsPathDestinations(text: string): string {
  if (!text.includes("](")) return text;
  let inFence = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^ {0,3}(?:`{3}|~{3})/.test(line)) inFence = !inFence;
      return inFence
        ? line
        : line.replace(
            SPACED_DRIVE_DESTINATION,
            // Slashs : un `\` avant le `>` fermant serait lu comme un échappement.
            (_, label: string, path: string) => `${label}(<${path.trim().replaceAll("\\", "/")}>)`,
          );
    })
    .join("\n");
}
