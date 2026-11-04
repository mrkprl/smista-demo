// Analizza una volta i 13 messaggi di esempio e salva il risultato in data/analisi-esempi.json.
import { MESSAGGI_DI_ESEMPIO } from "@/data/messaggi";
import { analizza } from "@/lib/ai/analizza";
import type { Analisi } from "@/lib/tipi";
import type { AnalisiEsempi } from "@/data/esempi";
import { controllaChiave, scriviJson } from "./comune";

async function main() {
  const modello = controllaChiave();
  const analisi: Record<string, Analisi> = {};
  for (const m of MESSAGGI_DI_ESEMPIO) {
    process.stdout.write(`${m.id} ... `);
    try {
      analisi[m.id] = await analizza(m.testo, { modello });
      const a = analisi[m.id];
      console.log(`${a.categoria} / ${a.urgenza} / confidenza ${a.confidenza}`);
    } catch (e) {
      console.log(`ERRORE: ${e instanceof Error ? e.message : String(e)}`);
      console.error("Interrotto: il file non è stato scritto.");
      process.exit(1);
    }
  }
  const file: AnalisiEsempi = { generatoIl: new Date().toISOString(), modello, origine: "ai", analisi };
  scriviJson("data/analisi-esempi.json", file);
  console.log("\nScritto data/analisi-esempi.json. Leggi le 13 analisi una per una prima di andare avanti.");
}

main();
