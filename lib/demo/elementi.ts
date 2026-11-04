// Unisce i messaggi di esempio, le loro analisi salvate e i messaggi di "Prova tu".
import { ANALISI_ESEMPI } from "@/data/esempi";
import { MESSAGGI_DI_ESEMPIO } from "@/data/messaggi";
import type { Analisi } from "@/lib/tipi";
import type { MessaggioInCoda } from "./coda";
import type { Provato } from "./stato";

const ESEMPI = MESSAGGI_DI_ESEMPIO.map((m) => ({
  messaggio: { id: m.id, canale: m.canale, mittente: m.mittente, testo: m.testo, ricevutoDaMinuti: m.ricevutoDaMinuti },
  analisi: (ANALISI_ESEMPI.analisi[m.id] ?? null) as Analisi | null,
}));

export function elementiCoda(provati: Provato[]): { messaggio: MessaggioInCoda; analisi: Analisi | null }[] {
  return [...ESEMPI, ...provati];
}

export const ORIGINE_ANALISI = ANALISI_ESEMPI.origine;
