import type { Categoria, Confidenza, Esito, Livello, Stato, TipoIntervento, Urgenza } from "./tipi";

export const ETICHETTA_CATEGORIA: Record<Categoria, string> = {
  sinistro: "Sinistro",
  assistenza: "Assistenza",
  modifica_polizza: "Modifica polizza",
  domanda_copertura: "Domanda sulla copertura",
  preventivo: "Preventivo",
  pagamenti: "Pagamenti",
  disdetta: "Disdetta",
  reclamo: "Reclamo",
  altro: "Altro",
};

export const ETICHETTA_URGENZA: Record<Urgenza, string> = { alta: "Urgenza alta", media: "Urgenza media", bassa: "Urgenza bassa" };

export const ETICHETTA_CONFIDENZA: Record<Confidenza, string> = { alta: "alta", media: "media", bassa: "bassa" };

export const ETICHETTA_STATO: Record<Stato, string> = {
  da_vedere: "Da vedere",
  da_rivedere: "Da rivedere",
  approvata: "In attesa di risposta",
  scartata: "Scartata",
  chiusa: "Pratica chiusa",
  automatica: "Risposta automatica",
  testo_fisso: "Chiamare il cliente",
};

export const ETICHETTA_LIVELLO: Record<Livello, string> = {
  automatico: "Automatico",
  bozza: "Bozza da approvare",
  solo_persona: "Solo persona",
};

export const ETICHETTA_ESITO: Record<Esito, string> = { ...ETICHETTA_LIVELLO, testo_fisso: "Testo fisso" };

export const DESCRIZIONE_LIVELLO: Record<Livello, string> = {
  automatico: "La risposta parte subito, se tutte le condizioni sono vere.",
  bozza: "L'operatore controlla la bozza e la approva.",
  solo_persona: "La risposta la scrive l'operatore. La bozza dell'AI è solo un riferimento.",
};

export function tempoFa(minuti: number): string {
  if (minuti < 1) return "adesso";
  if (minuti < 60) return `${Math.round(minuti)} min fa`;
  const ore = Math.floor(minuti / 60);
  if (ore < 24) return `${ore} h fa`;
  const giorni = Math.floor(ore / 24);
  return giorni === 1 ? "ieri" : `${giorni} giorni fa`;
}

export const ETICHETTA_CANALE = { email: "Email", whatsapp: "WhatsApp", prova: "Prova" } as const;

export const ETICHETTA_TECNICO: Record<TipoIntervento, string> = {
  nessuno: "Nessun tecnico",
  idraulico: "Idraulico",
  elettricista: "Elettricista",
  fabbro_falegname: "Fabbro e falegname",
  vetraio_serrandista: "Vetraio e serrandista",
  tecnico_gas_clima: "Tecnico gas e condizionatori",
  ripristino_rete: "Ripristino rete",
};
