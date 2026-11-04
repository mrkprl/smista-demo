// Analizza ogni messaggio di esempio 3 volte e confronta con i valori attesi (§8).
import { MESSAGGI_DI_ESEMPIO } from "@/data/messaggi";
import { analizza } from "@/lib/ai/analizza";
import { aggrega, valutaProva, type Prova } from "@/lib/valutazione";
import { controllaChiave, scriviJson } from "./comune";

const RIPETIZIONI = 3;
const IN_PARALLELO = 3;

async function main() {
  const modello = controllaChiave();
  const lavori = MESSAGGI_DI_ESEMPIO.flatMap((m) => Array.from({ length: RIPETIZIONI }, () => m));
  const prove: Prova[] = [];
  let prossimo = 0;

  async function lavoratore() {
    while (prossimo < lavori.length) {
      const m = lavori[prossimo++];
      try {
        prove.push(valutaProva(m, await analizza(m.testo, { modello })));
      } catch (e) {
        prove.push({ id: m.id, ok: false, errore: e instanceof Error ? e.message : String(e) });
      }
      process.stdout.write(".");
    }
  }
  await Promise.all(Array.from({ length: IN_PARALLELO }, lavoratore));

  const v = aggrega(prove, { eseguitaIl: new Date().toISOString(), modello, ripetizioni: RIPETIZIONI });
  const riga = (n: string, c: { giuste: number; totali: number }) => console.log(`${n.padEnd(36)} ${c.giuste}/${c.totali}`);

  console.log(`\n\nModello ${v.modello}, ${v.messaggi} messaggi × ${v.ripetizioni} = ${v.prove} prove, ${v.fallite} fallite\n`);
  riga("Categorie giuste", v.categorie);
  riga("Urgenze giuste", v.urgenze);
  riga("Tecnico giusto", v.tecnici);
  riga("Livello di risposta atteso", v.livelli);
  for (const r of v.regole) riga(r.etichetta, r);
  if (v.errori.length) {
    console.log("\nDove sbaglia:");
    for (const e of v.errori) console.log(`  ${e.id}  ${e.campo}: atteso ${e.atteso}, ottenuto ${e.ottenuto} (${e.volte}/${v.ripetizioni})`);
  }
  for (const p of prove) if (!p.ok) console.log(`  ${p.id}  errore: ${p.errore}`);

  if (v.fallite === v.prove) {
    console.error("\nTutte le prove sono fallite: data/valutazione.json NON è stato scritto.");
    process.exit(1);
  }
  scriviJson("data/valutazione.json", v);
  console.log("\nScritto data/valutazione.json (lo legge la pagina Come funziona).");
}

main();
