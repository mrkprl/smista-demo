import { writeFileSync } from "node:fs";
import { MODELLO_PREDEFINITO } from "@/lib/ai/analizza";

export function controllaChiave(): string {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Manca ANTHROPIC_API_KEY. Mettila in .env.local (vedi .env.example) e riprova.");
    process.exit(1);
  }
  return process.env.SMISTA_MODELLO || MODELLO_PREDEFINITO;
}

export function scriviJson(percorso: string, dati: unknown) {
  writeFileSync(percorso, JSON.stringify(dati, null, 2) + "\n", "utf8");
}
