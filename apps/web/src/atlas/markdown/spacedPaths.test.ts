// [Atlas] A28 : chemins Windows avec espaces rendus en image / lien.
import { describe, expect, it } from "vite-plus/test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { CHAT_MARKDOWN_REMARK_PLUGINS } from "@t3tools/shared/markdownPipeline";
import { resolveMarkdownFileLinkMeta } from "../../markdown-links";
import { wrapSpacedWindowsPathDestinations as wrap } from "./spacedPaths";

const BS = String.fromCharCode(92);
const FENCE = String.fromCharCode(96).repeat(3);
const winPath = (...parts: string[]) => parts.join(BS);
const DRIVE = winPath(
  "C:",
  "Users",
  "lloui",
  "iCloudDrive",
  "03 - Architecture",
  "MA1",
  "02 - Travail",
  "E2",
  "sweeps",
  "planche_cp.png",
);

function firstNode(markdown: string) {
  const tree = unified().use(remarkParse).use(CHAT_MARKDOWN_REMARK_PLUGINS).parse(wrap(markdown));
  const node = (tree as any).children[0].children[0];
  return [node.type, node.url] as const;
}

describe("wrapSpacedWindowsPathDestinations", () => {
  it("rend l'image d'un chemin à antislashs avec espaces, sans chevrons", () => {
    expect(firstNode(`![Planche](${DRIVE})`)).toEqual(["image", DRIVE.replaceAll(BS, "/")]);
  });
  it("rend l'image avec des slashs, avec /C:/, et laisse les chevrons déjà là", () => {
    expect(firstNode("![a](C:/Users/lloui/a b/p.png)")).toEqual([
      "image",
      "C:/Users/lloui/a b/p.png",
    ]);
    expect(firstNode("![a](/C:/Users/lloui/a b/p.png)")).toEqual([
      "image",
      "/C:/Users/lloui/a b/p.png",
    ]);
    expect(firstNode("![a](<C:/a b/p.png>)")).toEqual(["image", "C:/a b/p.png"]);
  });
  it("rend un lien vers un dossier", () => {
    const folder = winPath("C:", "Users", "lloui", "02 - Travail", "E2", "sweeps") + BS;
    expect(firstNode(`[sweeps](${folder})`)).toEqual(["link", folder.replaceAll(BS, "/")]);
  });
  it("ne touche ni les chemins sans espace, ni les liens web, ni les blocs de code", () => {
    const same = [
      `![a](${winPath("C:", "x", "y.png")})`,
      "[a](https://x.y/a b)",
      [FENCE, `![a](${winPath("C:", "a b", "c.png")})`, FENCE].join("\n"),
    ];
    for (const text of same) expect(wrap(text)).toBe(text);
  });
  it("le chemin devient un lien de fichier résolu pour la visionneuse", () => {
    expect(resolveMarkdownFileLinkMeta(DRIVE, "C:/Users/lloui/proj")?.filePath).toBe(DRIVE);
    expect(resolveMarkdownFileLinkMeta("/C:/Users/lloui/a b/p.png")?.basename).toBe("p.png");
  });
});
