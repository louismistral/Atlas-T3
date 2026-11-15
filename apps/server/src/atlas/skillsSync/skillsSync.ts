// @effect-diagnostics nodeBuiltinImport:off - lit les skills claude.ai locaux et les zips à importer.
// [Atlas] A25 : état de synchronisation des skills claude.ai, à la place de la vérification manuelle
// de chaque début de session (règles du CLAUDE.md de Louis, section « Synchronisation des skills »).
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as Yauzl from "yauzl";

export type ZipStatus = "imported" | "pending" | "diverged" | "unknown";

export interface SkillsSyncReport {
  readonly zips: ReadonlyArray<{
    readonly name: string;
    readonly status: ZipStatus;
    readonly activeAccount: boolean;
  }>;
  /** Skills du compte actif modifiés depuis le dernier téléchargement, sans zip. */
  readonly changedWithoutZip: ReadonlyArray<string>;
  readonly removed: ReadonlyArray<string>;
}

interface Account {
  readonly dir: string;
  readonly lastUpdated: number;
  readonly updatedAt: ReadonlyMap<string, number>;
  /** Les skills créés par Louis : claude.ai réécrit ceux d'Anthropic après coup. */
  readonly userSkills: ReadonlySet<string>;
}

function readAccounts(pluginRoot: string): Account[] {
  const accounts: Account[] = [];
  for (const org of safeList(pluginRoot)) {
    for (const acct of safeList(NodePath.join(pluginRoot, org))) {
      const dir = NodePath.join(pluginRoot, org, acct);
      try {
        const manifest = JSON.parse(
          NodeFS.readFileSync(NodePath.join(dir, "manifest.json"), "utf8"),
        );
        accounts.push({
          dir,
          lastUpdated: Number(manifest.lastUpdated) || 0,
          updatedAt: new Map(
            (manifest.skills ?? []).map((s: { name: string; updatedAt: string }) => [
              s.name,
              Date.parse(s.updatedAt) || 0,
            ]),
          ),
          userSkills: new Set(
            (manifest.skills ?? [])
              .filter((s: { creatorType?: string }) => s.creatorType === "user")
              .map((s: { name: string }) => s.name),
          ),
        });
      } catch {}
    }
  }
  return accounts;
}

function safeList(dir: string): string[] {
  try {
    return NodeFS.readdirSync(dir);
  } catch {
    return [];
  }
}

/** Les fichiers d'un dossier de skill, chemins relatifs avec des « / ». */
function readSkillDir(dir: string, prefix = ""): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of NodeFS.readdirSync(dir, { withFileTypes: true })) {
    const path = NodePath.join(dir, entry.name);
    const rel = prefix + entry.name;
    if (entry.isDirectory()) for (const [k, v] of readSkillDir(path, `${rel}/`)) files.set(k, v);
    else files.set(rel, NodeFS.readFileSync(path, "utf8"));
  }
  return files;
}

function latestMtime(dir: string): number {
  let latest = 0;
  for (const entry of NodeFS.readdirSync(dir, { withFileTypes: true })) {
    const path = NodePath.join(dir, entry.name);
    latest = Math.max(
      latest,
      entry.isDirectory() ? latestMtime(path) : NodeFS.statSync(path).mtimeMs,
    );
  }
  return latest;
}

/** Le contenu d'un zip : nom du skill (dossier racine) et fichiers relatifs à ce dossier. */
function readZip(file: string): Promise<{ name: string; files: Map<string, string> }> {
  return new Promise((resolve, reject) => {
    Yauzl.open(file, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(error);
      const files = new Map<string, string>();
      let name = "";
      zip.on("error", reject);
      zip.on("end", () => resolve({ name, files }));
      zip.on("entry", (entry: Yauzl.Entry) => {
        const [root, ...rest] = entry.fileName.split("/");
        name ||= root ?? "";
        if (entry.fileName.endsWith("/") || rest.length === 0) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return reject(streamError);
          const chunks: Buffer[] = [];
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", () => {
            files.set(rest.join("/"), Buffer.concat(chunks).toString("utf8"));
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

const normalize = (text: string) => text.replaceAll("\r\n", "\n");

export function sameFiles(a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>) {
  if (a.size !== b.size) return false;
  for (const [path, text] of a) {
    const other = b.get(path);
    if (other === undefined || normalize(other) !== normalize(text)) return false;
  }
  return true;
}

/** Les règles du CLAUDE.md : importé (on supprime le zip), à importer, ou divergence. */
export function zipStatus(input: {
  readonly sameContent: boolean;
  readonly updatedAt: number | undefined;
  readonly zipTime: number;
}): ZipStatus {
  if (input.updatedAt === undefined) return "unknown";
  if (input.updatedAt < input.zipTime) return "pending";
  return input.sameContent ? "imported" : "diverged";
}

export async function skillsSyncReport(input: {
  readonly pluginRoot: string;
  readonly transferDir: string;
}): Promise<SkillsSyncReport> {
  const accounts = readAccounts(input.pluginRoot);
  const active = accounts.reduce<Account | null>(
    (best, account) => (best === null || account.lastUpdated > best.lastUpdated ? account : best),
    null,
  );
  const zips: Array<SkillsSyncReport["zips"][number]> = [];
  const removed: string[] = [];
  const zipped = new Set<string>();
  for (const fileName of safeList(input.transferDir).filter((f) => f.endsWith(".zip"))) {
    const file = NodePath.join(input.transferDir, fileName);
    let zip: { name: string; files: Map<string, string> };
    try {
      zip = await readZip(file);
    } catch {
      continue;
    }
    zipped.add(zip.name);
    // Le compte du skill : celui dont le dossier le contient, le compte actif d'abord.
    const owner = [active, ...accounts].find(
      (account) => account && NodeFS.existsSync(NodePath.join(account.dir, "skills", zip.name)),
    );
    const status: ZipStatus = owner
      ? zipStatus({
          sameContent: sameFiles(
            zip.files,
            readSkillDir(NodePath.join(owner.dir, "skills", zip.name)),
          ),
          updatedAt: owner.updatedAt.get(zip.name),
          zipTime: NodeFS.statSync(file).mtimeMs,
        })
      : "unknown";
    if (status === "imported") {
      NodeFS.rmSync(file);
      removed.push(zip.name);
      continue;
    }
    zips.push({ name: zip.name, status, activeAccount: owner === active });
  }
  const changedWithoutZip =
    active === null
      ? []
      : safeList(NodePath.join(active.dir, "skills")).filter((name) => {
          if (zipped.has(name) || !active.userSkills.has(name)) return false;
          try {
            return latestMtime(NodePath.join(active.dir, "skills", name)) > active.lastUpdated;
          } catch {
            return false;
          }
        });
  return { zips, changedWithoutZip, removed };
}
