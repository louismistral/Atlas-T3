// [Atlas] A26 : une lettre par entrée des menus clic droit, visible à droite et soulignée dans le
// libellé ; appuyer sur la lettre choisit l'entrée (mnémonique Windows), sans passer par la souris.

/** Choisit une lettre distincte par entrée d'un même niveau : d'abord l'initiale d'un mot, sinon une autre. */
export function menuLetters(labels: ReadonlyArray<string>): Array<string | null> {
  const used = new Set<string>();
  return labels.map((label) => {
    const words = label.split(/\s+/).map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""));
    const initials = words.map((word) => word[0] ?? "");
    const others = [...label.replace(/[^\p{L}\p{N}]/gu, "")];
    const letter = [...initials, ...others].find((c) => c !== "" && !used.has(c.toUpperCase()));
    if (letter === undefined) return null;
    used.add(letter.toUpperCase());
    return letter.toUpperCase();
  });
}

/** Le libellé avec « & » devant la lettre (les « & » d'origine doublés pour rester du texte). */
export function withMnemonic(label: string, letter: string | null): string {
  const escaped = label.replaceAll("&", "&&");
  if (letter === null) return escaped;
  // Initiale d'un mot en priorité, comme dans menuLetters.
  const word = new RegExp(`(^|\\s)(${letter})`, "i").exec(escaped);
  const at = word ? word.index + word[1]!.length : escaped.toUpperCase().indexOf(letter);
  return at < 0 ? escaped : `${escaped.slice(0, at)}&${escaped.slice(at)}`;
}
