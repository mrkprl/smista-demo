// Analisi salvate dei messaggi di esempio e risultato della valutazione.
// Si generano con `npm run analizza-esempi` e `npm run valuta`.
import * as z from "zod/v4";
import { SchemaAnalisi } from "@/lib/tipi";
import type { Valutazione } from "@/lib/valutazione";
import analisiJson from "./analisi-esempi.json";
import valutazioneJson from "./valutazione.json";

export const SchemaAnalisiEsempi = z.object({
  generatoIl: z.string(),
  modello: z.string(),
  /** "scritte_a_mano" = segnaposto per sviluppare l'interfaccia, da sostituire con quelle dell'AI. */
  origine: z.enum(["ai", "scritte_a_mano"]),
  analisi: z.record(z.string(), SchemaAnalisi),
});

export type AnalisiEsempi = z.infer<typeof SchemaAnalisiEsempi>;

export const ANALISI_ESEMPI: AnalisiEsempi = SchemaAnalisiEsempi.parse(analisiJson);

const valutazione = valutazioneJson as unknown as Partial<Valutazione>;

/** null finché `npm run valuta` non è stato eseguito. */
export const VALUTAZIONE: Valutazione | null = valutazione.eseguitaIl ? (valutazione as Valutazione) : null;
