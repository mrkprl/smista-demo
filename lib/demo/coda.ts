// Costruisce la coda mostrata in pagina: analisi + correzioni dell'operatore + regole. Funzioni pure.
import { avvisiPer, decidiEsito, ordinaCoda, statoDi, type AzioneOperatore, type Decisione } from "@/lib/regole";
import type { Analisi, Avviso, Canale, Categoria, Impostazioni, Stato, Urgenza } from "@/lib/tipi";

/** Riferimento fisso per gli orari relativi: in pagina contano solo le differenze, non l'ora vera. */
export const ORA_RIFERIMENTO = new Date("2026-01-01T12:00:00Z");

export type MessaggioInCoda = {
  id: string;
  canale: Canale | "prova";
  mittente: string;
  testo: string;
  ricevutoDaMinuti: number;
};

export type Correzione = { categoria?: Categoria; urgenza?: Urgenza };

export type ScelteOperatore = {
  impostazioni: Impostazioni;
  azioni: Record<string, AzioneOperatore>;
  bozze: Record<string, string>;
  correzioni: Record<string, Correzione>;
};

export type Voce = {
  messaggio: MessaggioInCoda;
  ricevutoIl: string;
  /** Analisi dell'AI così com'è arrivata. */
  originale: Analisi | null;
  /** Analisi con le correzioni dell'operatore e la bozza attuale. */
  analisi: Analisi | null;
  decisione: Decisione | null;
  stato: Stato;
  avvisi: Avviso[];
  correzione: Correzione;
  bozzaModificata: boolean;
};

export function costruisciVoce(m: MessaggioInCoda, originale: Analisi | null, s: ScelteOperatore): Voce {
  const ricevutoIl = new Date(ORA_RIFERIMENTO.getTime() - m.ricevutoDaMinuti * 60_000).toISOString();
  const correzione = s.correzioni[m.id] ?? {};
  const bozza = s.bozze[m.id];

  if (!originale) {
    return {
      messaggio: m,
      ricevutoIl,
      originale: null,
      analisi: null,
      decisione: null,
      stato: s.azioni[m.id] ?? "da_rivedere",
      avvisi: [],
      correzione,
      bozzaModificata: false,
    };
  }

  const analisi: Analisi = {
    ...originale,
    categoria: correzione.categoria ?? originale.categoria,
    urgenza: correzione.urgenza ?? originale.urgenza,
    bozza_risposta: bozza ?? originale.bozza_risposta,
  };
  const decisione = decidiEsito(analisi, s.impostazioni);
  return {
    messaggio: m,
    ricevutoIl,
    originale,
    analisi,
    decisione,
    stato: statoDi(decisione, analisi, s.azioni[m.id]),
    avvisi: avvisiPer(analisi),
    correzione,
    bozzaModificata: bozza !== undefined && bozza !== originale.bozza_risposta,
  };
}

export function costruisciCoda(
  elementi: { messaggio: MessaggioInCoda; analisi: Analisi | null }[],
  s: ScelteOperatore,
): Voce[] {
  const voci = elementi.map((e) => ({ ...costruisciVoce(e.messaggio, e.analisi, s), id: e.messaggio.id }));
  return ordinaCoda(voci, ORA_RIFERIMENTO);
}

export function gestita(stato: Stato): boolean {
  return stato === "approvata" || stato === "scartata" || stato === "automatica" || stato === "chiusa";
}
