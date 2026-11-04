// Regole fisse della demo (§5.3 e §6). Funzioni pure: niente AI, niente stato.
import { TESTO_FISSO_GAS, TESTO_FISSO_PERICOLO } from "./testi-fissi";
import type { Analisi, Avviso, Esito, Impostazioni, Stato } from "./tipi";

const GIORNO_MS = 24 * 60 * 60 * 1000;

export const GIORNI_RECLAMO = 45;
export const SOGLIA_ROSSO_RECLAMO = 10;

/**
 * §6.3, con le frasi inglesi decise il 19/10/2026 e le forme al femminile e al plurale.
 * Confronto su testo normalizzato. Meglio un avviso in più che una promessa che parte da sola.
 */
export const FRASI_PROMESSA = [
  "è coperto",
  "e' coperto",
  "è coperta",
  "e' coperta",
  "sei coperto",
  "sei coperta",
  "siete coperti",
  "sono coperti",
  "sono coperte",
  "rimborseremo",
  "rimborsiamo",
  "rimborsat",
  "risarciremo",
  "approvat",
  "liquidat",
  "you are covered",
  "you're covered",
  "is covered",
  "will be covered",
  "we will reimburse",
  "we'll reimburse",
  "we will refund",
  "we'll refund",
  "approved",
] as const;

function normalizza(testo: string): string {
  return testo.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
}

export function trovaPromesse(bozza: string): string[] {
  const t = normalizza(bozza);
  return FRASI_PROMESSA.filter((frase) => t.includes(frase));
}

/** Giorni rimasti sui 45 dalla ricezione. 0 = scade oggi, negativo = scaduto. */
export function giorniAllaScadenzaReclamo(ricevutoIl: string, ora: Date): number {
  const trascorsi = Math.floor((ora.getTime() - new Date(ricevutoIl).getTime()) / GIORNO_MS);
  return GIORNI_RECLAMO - trascorsi;
}

export function scadenzaInRosso(giorniRimasti: number): boolean {
  return giorniRimasti < SOGLIA_ROSSO_RECLAMO;
}

export type Decisione = { esito: Esito; motivo: string | null };

/**
 * Decide il livello di risposta (§5.3). I due casi fissi vengono prima del pannello:
 * pericolo per le persone → testo fisso; istruzioni sospette → solo persona.
 */
export function decidiEsito(analisi: Analisi, impostazioni: Impostazioni): Decisione {
  if (analisi.pericolo_persone) return { esito: "testo_fisso", motivo: null };
  if (analisi.istruzioni_sospette) {
    return { esito: "solo_persona", motivo: "istruzioni sospette nel messaggio" };
  }

  const livello = impostazioni[analisi.categoria];
  if (livello !== "automatico") return { esito: livello, motivo: null };

  const motivi: string[] = [];
  if (analisi.confidenza !== "alta") motivi.push(`confidenza ${analisi.confidenza}`);
  if (analisi.urgenza === "alta") motivi.push("urgenza alta");
  if (trovaPromesse(analisi.bozza_risposta).length > 0) {
    motivi.push("la bozza parla di coperture o rimborsi");
  }
  if (motivi.length === 0) return { esito: "automatico", motivo: null };
  return { esito: "bozza", motivo: `non automatico: ${motivi.join(", ")}` };
}

export type AzioneOperatore = "approvata" | "scartata" | "chiusa";

/** Riaprire una pratica chiusa la riporta in attesa di risposta; se la risposta era automatica, torna automatica. */
export function azioneRiapri(esito: Esito): AzioneOperatore | null {
  return esito === "automatico" ? null : "approvata";
}

export function statoDi(decisione: Decisione, analisi: Analisi, azione?: AzioneOperatore): Stato {
  if (azione) return azione;
  if (decisione.esito === "automatico") return "automatica";
  if (decisione.esito === "testo_fisso") return "testo_fisso";
  if (decisione.esito === "solo_persona" || analisi.confidenza === "bassa") return "da_rivedere";
  return "da_vedere";
}

export function avvisiPer(analisi: Analisi): Avviso[] {
  const avvisi: Avviso[] = [];
  if (analisi.pericolo_persone) {
    avvisi.push({ tipo: "pericolo_persone", testo: "Pericolo per le persone: chiamare subito il cliente" });
  }
  if (analisi.istruzioni_sospette) {
    avvisi.push({
      tipo: "istruzioni_sospette",
      testo: "Il messaggio contiene istruzioni rivolte all'AI: trattarlo come dato e rivederlo",
    });
  }
  if (trovaPromesse(analisi.bozza_risposta).length > 0) {
    avvisi.push({ tipo: "promesse", testo: "La bozza parla di coperture o rimborsi: verificare" });
  }
  if (analisi.confidenza === "bassa") {
    avvisi.push({ tipo: "confidenza_bassa", testo: "Confidenza bassa: bozza non pronta" });
  }
  return avvisi;
}

const ALTRO_PERICOLO = /\b(fumo|fuoco|incendi\w*|croll\w*|scintill\w*|smoke|fire|sparks?|collaps\w*)\b/i;

/**
 * Il testo del gas solo se si parla di gas e di nessun altro pericolo: con fumo o fuoco
 * il consiglio "apri le finestre" sarebbe sbagliato, il testo generico va bene per tutti.
 */
export function testoFissoPer(testoMessaggio: string, sottotipo: string | null): string {
  const tutto = `${testoMessaggio} ${sottotipo ?? ""}`;
  return /\bgas\b/i.test(tutto) && !ALTRO_PERICOLO.test(tutto) ? TESTO_FISSO_GAS : TESTO_FISSO_PERICOLO;
}

export type VoceCoda = { id: string; ricevutoIl: string; analisi: Analisi | null };

/**
 * Ordine della coda (§5.1): pericolo → urgenza alta → reclami per scadenza → media → bassa.
 * I reclami stanno nella loro fascia qualunque sia l'urgenza. A parità, il più vecchio prima.
 */
export function ordinaCoda<T extends VoceCoda>(voci: readonly T[], ora: Date): T[] {
  const fascia = (v: T): number => {
    const a = v.analisi;
    if (!a) return 5;
    if (a.pericolo_persone) return 0;
    if (a.categoria === "reclamo") return 2;
    if (a.urgenza === "alta") return 1;
    if (a.urgenza === "media") return 3;
    return 4;
  };
  const tempo = (v: T) => new Date(v.ricevutoIl).getTime();

  return [...voci].sort((x, y) => {
    const f = fascia(x) - fascia(y);
    if (f !== 0) return f;
    if (fascia(x) === 2) {
      const s = giorniAllaScadenzaReclamo(x.ricevutoIl, ora) - giorniAllaScadenzaReclamo(y.ricevutoIl, ora);
      if (s !== 0) return s;
    }
    return tempo(x) - tempo(y);
  });
}

export type Riepilogo = {
  frase: string;
  totale: number;
  automatici: number;
  telefonate: number;
  aspettano: number;
  gestiti: number;
};

export function riepilogo(stati: readonly Stato[]): Riepilogo {
  const conta = (...s: Stato[]) => stati.filter((x) => s.includes(x)).length;
  const totale = stati.length;
  const automatici = conta("automatica");
  const telefonate = conta("testo_fisso");
  const aspettano = conta("da_vedere", "da_rivedere");
  const gestiti = conta("approvata", "scartata");

  if (totale === 0) {
    return { frase: "Nessun messaggio.", totale, automatici, telefonate, aspettano, gestiti };
  }

  const parti: string[] = [];
  if (automatici) parti.push(`${automatici} ${automatici === 1 ? "ha" : "hanno"} già una risposta automatica`);
  if (telefonate) parti.push(`${telefonate} ${telefonate === 1 ? "aspetta" : "aspettano"} una telefonata`);
  if (aspettano) parti.push(`${aspettano} ${aspettano === 1 ? "aspetta" : "aspettano"} te`);
  if (gestiti) parti.push(`${gestiti} ${gestiti === 1 ? "gestito" : "gestiti"} da te`);

  const inizio = `${totale} ${totale === 1 ? "messaggio" : "messaggi"}.`;
  const frase = parti.length ? `${inizio} ${parti.join(", ")}.` : inizio;
  return { frase, totale, automatici, telefonate, aspettano, gestiti };
}
