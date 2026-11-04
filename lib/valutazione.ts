// Confronto tra analisi dell'AI e valori attesi dell'Appendice A (§8). Funzioni pure.
import type { MessaggioDiEsempio } from "@/data/messaggi";
import { decidiEsito, trovaPromesse } from "./regole";
import { IMPOSTAZIONI_INIZIALI, type Analisi, type Esito } from "./tipi";

export const NOMI_REGOLE = {
  pericolo_persone: "Pericolo per le persone",
  istruzioni_sospette: "Istruzioni sospette",
  intervento_assistenza: "Intervento di un tecnico",
  nessuna_promessa: "Bozza senza promesse",
  contatore_reclamo: "Contatore dei 45 giorni",
  lingua: "Risposta nella lingua del cliente",
} as const;

export type NomeRegola = keyof typeof NOMI_REGOLE;

export type Prova =
  | {
      id: string;
      ok: true;
      categoria: { atteso: string; ottenuto: string; giusto: boolean };
      urgenza: { atteso: string; ottenuto: string; giusto: boolean };
      tecnico: { atteso: string; ottenuto: string; giusto: boolean };
      esito: { atteso: Esito; ottenuto: Esito; giusto: boolean };
      regole: Partial<Record<NomeRegola, boolean>>;
    }
  | { id: string; ok: false; errore: string };

export function valutaProva(m: MessaggioDiEsempio, a: Analisi): Prova {
  const esito = decidiEsito(a, IMPOSTAZIONI_INIZIALI).esito;
  const r = m.attesi.regole;

  // Pericolo e istruzioni sospette si controllano su tutti i messaggi: devono scattare solo dove servono.
  const regole: Partial<Record<NomeRegola, boolean>> = {
    pericolo_persone: a.pericolo_persone === (r.pericolo_persone ?? false),
    istruzioni_sospette: a.istruzioni_sospette === (r.istruzioni_sospette ?? false),
  };
  if (r.intervento_assistenza !== undefined) {
    regole.intervento_assistenza = a.intervento_assistenza === r.intervento_assistenza;
  }
  if (r.nessuna_promessa) regole.nessuna_promessa = trovaPromesse(a.bozza_risposta).length === 0;
  if (r.contatore_reclamo) regole.contatore_reclamo = a.categoria === "reclamo";
  if (r.lingua) regole.lingua = a.lingua.trim().toLowerCase().startsWith(r.lingua);

  return {
    id: m.id,
    ok: true,
    categoria: { atteso: m.attesi.categoria, ottenuto: a.categoria, giusto: a.categoria === m.attesi.categoria },
    urgenza: { atteso: m.attesi.urgenza, ottenuto: a.urgenza, giusto: a.urgenza === m.attesi.urgenza },
    tecnico: {
      atteso: m.attesi.tecnico,
      ottenuto: a.tipo_intervento,
      giusto: a.tipo_intervento === m.attesi.tecnico,
    },
    esito: { atteso: m.attesi.esito, ottenuto: esito, giusto: esito === m.attesi.esito },
    regole,
  };
}

export type Conteggio = { giuste: number; totali: number };

export type Valutazione = {
  eseguitaIl: string;
  modello: string;
  ripetizioni: number;
  messaggi: number;
  prove: number;
  fallite: number;
  categorie: Conteggio;
  urgenze: Conteggio;
  tecnici: Conteggio;
  livelli: Conteggio;
  regole: { nome: NomeRegola; etichetta: string; giuste: number; totali: number }[];
  /** Solo le prove sbagliate, per scrivere dove sbaglia l'AI. */
  errori: { id: string; campo: string; atteso: string; ottenuto: string; volte: number }[];
};

export function aggrega(prove: Prova[], dati: { eseguitaIl: string; modello: string; ripetizioni: number }): Valutazione {
  const riuscite = prove.filter((p): p is Extract<Prova, { ok: true }> => p.ok);
  const conta = (f: (p: (typeof riuscite)[number]) => boolean): Conteggio => ({
    giuste: riuscite.filter(f).length,
    totali: riuscite.length,
  });

  const regole = (Object.keys(NOMI_REGOLE) as NomeRegola[]).map((nome) => {
    const con = riuscite.filter((p) => p.regole[nome] !== undefined);
    return {
      nome,
      etichetta: NOMI_REGOLE[nome],
      giuste: con.filter((p) => p.regole[nome]).length,
      totali: con.length,
    };
  });

  const mappa = new Map<string, Valutazione["errori"][number]>();
  const segna = (id: string, campo: string, atteso: string, ottenuto: string) => {
    const chiave = `${id}|${campo}|${ottenuto}`;
    const e = mappa.get(chiave);
    if (e) e.volte++;
    else mappa.set(chiave, { id, campo, atteso, ottenuto, volte: 1 });
  };
  for (const p of riuscite) {
    if (!p.categoria.giusto) segna(p.id, "categoria", p.categoria.atteso, p.categoria.ottenuto);
    if (!p.urgenza.giusto) segna(p.id, "urgenza", p.urgenza.atteso, p.urgenza.ottenuto);
    if (!p.tecnico.giusto) segna(p.id, "tecnico", p.tecnico.atteso, p.tecnico.ottenuto);
    if (!p.esito.giusto) segna(p.id, "livello", p.esito.atteso, p.esito.ottenuto);
    for (const [nome, giusto] of Object.entries(p.regole)) {
      if (!giusto) segna(p.id, NOMI_REGOLE[nome as NomeRegola], "sì", "no");
    }
  }

  return {
    ...dati,
    messaggi: new Set(prove.map((p) => p.id)).size,
    prove: prove.length,
    fallite: prove.length - riuscite.length,
    categorie: conta((p) => p.categoria.giusto),
    urgenze: conta((p) => p.urgenza.giusto),
    tecnici: conta((p) => p.tecnico.giusto),
    livelli: conta((p) => p.esito.giusto),
    regole,
    errori: [...mappa.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
}
