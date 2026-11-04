import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const RADICE = join(__dirname, "..");
const ESCLUSE = new Set(["node_modules", ".next", ".git", "test"]);

function file(dir: string, out: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    if (ESCLUSE.has(nome)) continue;
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) file(p, out);
    else if (/\.(ts|tsx|mts|js|mjs|json|css)$/.test(nome)) out.push(p);
  }
  return out;
}

const TUTTI = file(RADICE).map((p) => ({ percorso: relative(RADICE, p).split(sep).join("/"), testo: readFileSync(p, "utf8") }));

describe("confini del codice", () => {
  it("solo lib/ai/ importa l'SDK di Anthropic", () => {
    const fuori = TUTTI.filter(
      (f) =>
        /from\s+["']@anthropic-ai\/sdk|require\(["']@anthropic-ai\/sdk|import\(["']@anthropic-ai\/sdk/.test(f.testo) &&
        !f.percorso.startsWith("lib/ai/") &&
        f.percorso !== "package.json" &&
        f.percorso !== "package-lock.json",
    ).map((f) => f.percorso);
    expect(fuori).toEqual([]);
  });

  it("il piè di pagina dice che la compagnia è inventata", () => {
    const pie = TUTTI.find((f) => f.percorso === "components/PieDiPagina.tsx")!.testo;
    expect(pie).toContain("Assicurazioni Esempio è una compagnia inventata");
  });

  it("nessun HTML grezzo nell'interfaccia", () => {
    const pericolosi = TUTTI.filter((f) => /dangerouslySetInnerHTML|innerHTML\s*=/.test(f.testo)).map((f) => f.percorso);
    expect(pericolosi).toEqual([]);
  });

  it("nessuna chiave nel repository", () => {
    const conChiavi = TUTTI.filter((f) => /sk-ant-[a-z0-9]{4,}/i.test(f.testo) && !f.percorso.endsWith(".test.ts")).map((f) => f.percorso);
    expect(conChiavi).toEqual([]);
  });

  it("nessun componente client legge variabili d'ambiente segrete", () => {
    const client = TUTTI.filter((f) => /^["']use client["']/.test(f.testo));
    for (const f of client) expect(f.testo, f.percorso).not.toMatch(/process\.env\.(ANTHROPIC|DATABASE|SMISTA)/);
  });
});
