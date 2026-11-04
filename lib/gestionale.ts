// Abbinamento con il gestionale e scelta del convenzionato. Funzioni pure, decide il codice:
// l'AI dice solo che tecnico serve, chi è il cliente e dove mandarlo lo calcola questo file.
import { CITTA, CLIENTI, CONVENZIONATI, type Cliente, type Convenzionato, type Posizione } from "@/data/gestionale";
import type { Analisi, TipoIntervento } from "./tipi";

/** Oltre questa distanza un convenzionato non è "vicino": meglio non suggerirlo. */
export const RAGGIO_KM = 50;
const QUANTI = 3;

const RE_POLIZZA = /\b([a-z]{2})[\s-]?(\d{5})\b/i;

function testoPulito(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function polizzaPulita(s: string): string | null {
  const m = RE_POLIZZA.exec(s);
  return m ? `${m[1].toUpperCase()}-${m[2]}` : null;
}

/** Le ultime 10 cifre: così +39 347 000 1122 e 3470001122 sono lo stesso numero. */
function telefonoPulito(s: string): string | null {
  const cifre = s.replace(/\D/g, "");
  return cifre.length >= 9 ? cifre.slice(-10) : null;
}

export type Abbinamento = { cliente: Cliente; come: "numero di polizza" | "numero di telefono" | "nome" };

type MessaggioMinimo = { mittente: string; testo: string };

/** Cerca il cliente nel gestionale: prima la polizza, poi il telefono, poi il nome. Mai a caso. */
export function trovaCliente(m: MessaggioMinimo, a: Analisi): Abbinamento | null {
  const polizza = polizzaPulita(a.dati_estratti.numero_polizza ?? "") ?? polizzaPulita(m.testo);
  if (polizza) {
    const c = CLIENTI.find((x) => x.polizza === polizza);
    if (c) return { cliente: c, come: "numero di polizza" };
  }

  const tel = telefonoPulito(m.mittente);
  if (tel) {
    const c = CLIENTI.find((x) => x.telefono && telefonoPulito(x.telefono) === tel);
    if (c) return { cliente: c, come: "numero di telefono" };
  }

  for (const nome of [m.mittente, a.dati_estratti.nome]) {
    if (!nome) continue;
    const n = testoPulito(nome);
    const c = CLIENTI.find((x) => testoPulito(x.nome) === n);
    if (c) return { cliente: c, come: "nome" };
  }
  return null;
}

/** Distanza in linea d'aria (formula dell'emisenoverso), arrotondata a 0,1 km. */
export function distanzaKm(a: Posizione, b: Posizione): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export type ConvenzionatoVicino = Convenzionato & { km: number };

export function convenzionatiVicini(tipo: Exclude<TipoIntervento, "nessuno">, da: Posizione): ConvenzionatoVicino[] {
  return CONVENZIONATI.filter((c) => c.tipo === tipo)
    .map((c) => ({ ...c, km: distanzaKm(da, c.posizione) }))
    .filter((c) => c.km <= RAGGIO_KM)
    .sort((x, y) => x.km - y.km)
    .slice(0, QUANTI);
}

function cittaNelTesto(...testi: (string | null)[]): string | null {
  const t = ` ${testoPulito(testi.filter(Boolean).join(" "))} `;
  return Object.keys(CITTA).find((c) => t.includes(` ${testoPulito(c)} `)) ?? null;
}

/** true se il messaggio indica un indirizzo diverso da quello dell'immobile assicurato. */
function indirizzoDiverso(cliente: Cliente, indirizzoMessaggio: string | null): boolean {
  if (!indirizzoMessaggio) return false;
  return !` ${testoPulito(indirizzoMessaggio)} `.includes(` ${testoPulito(cliente.indirizzo)} `);
}

export type Suggerimento = {
  tipo: Exclude<TipoIntervento, "nessuno">;
  cliente: Abbinamento | null;
  posizione: { punto: Posizione; fonte: "gestionale" | "città"; descrizione: string } | null;
  indirizzoDiverso: boolean;
  convenzionati: ConvenzionatoVicino[];
};

export function suggerisciIntervento(m: MessaggioMinimo, a: Analisi): Suggerimento | null {
  if (a.tipo_intervento === "nessuno") return null;
  const tipo = a.tipo_intervento;
  const cliente = trovaCliente(m, a);

  let posizione: Suggerimento["posizione"] = null;
  if (cliente) {
    const c = cliente.cliente;
    posizione = { punto: c.posizione, fonte: "gestionale", descrizione: `${c.indirizzo}, ${c.citta}` };
  } else {
    const citta = cittaNelTesto(a.dati_estratti.indirizzo, m.testo);
    if (citta) posizione = { punto: CITTA[citta], fonte: "città", descrizione: citta };
  }

  return {
    tipo,
    cliente,
    posizione,
    indirizzoDiverso: cliente ? indirizzoDiverso(cliente.cliente, a.dati_estratti.indirizzo) : false,
    convenzionati: posizione ? convenzionatiVicini(tipo, posizione.punto) : [],
  };
}

/**
 * Dei dati che l'AI dice mancanti, quali conosciamo già: quelli del cliente in gestionale e,
 * su WhatsApp, il numero di telefono. Il confronto è sulle parole, il sinistro non si tocca.
 */
export function daChiedere(
  mancanti: readonly string[],
  abbinamento: Abbinamento | null,
  canale: string,
): { daChiedere: string[]; giaNoti: string[] } {
  const noto = (voce: string): boolean => {
    const t = ` ${testoPulito(voce)} `;
    if (t.includes(" sinistro ") || t.includes(" denuncia ")) return false;
    const telefono = /\b(telefon\w*|cellulare|recapito)\b/.test(t);
    if (telefono) return canale === "whatsapp" || Boolean(abbinamento?.cliente.telefono);
    if (!abbinamento) return false;
    return /\b(nome|cognome|polizza|indirizzo|immobile)\b/.test(t);
  };
  return { daChiedere: mancanti.filter((x) => !noto(x)), giaNoti: mancanti.filter(noto) };
}

/** Link tel: con il prefisso internazionale. I numeri italiani senza prefisso prendono +39. */
export function linkTelefono(numero: string): string {
  const cifre = numero.replace(/\D/g, "");
  if (numero.trim().startsWith("+")) return `tel:+${cifre}`;
  if (cifre.startsWith("39") && cifre.length === 12) return `tel:+${cifre}`;
  return `tel:+39${cifre}`;
}

export type TelefonoCliente = { numero: string; chiama: string; whatsapp: string | null };

/** Il numero per richiamare il cliente: quello da cui ha scritto su WhatsApp, altrimenti quello in gestionale. */
export function telefonoCliente(
  m: { canale: string; mittente: string },
  abbinamento: Abbinamento | null,
): TelefonoCliente | null {
  const daWhatsapp = m.canale === "whatsapp" && telefonoPulito(m.mittente) ? m.mittente : null;
  const numero = daWhatsapp ?? abbinamento?.cliente.telefono ?? null;
  if (!numero) return null;
  const chiama = linkTelefono(numero);
  return { numero, chiama, whatsapp: daWhatsapp ? `https://wa.me/${chiama.slice(5)}` : null };
}
