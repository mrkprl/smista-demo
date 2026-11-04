// Limiti di "Prova con un tuo messaggio" (§5.4): 5 analisi per IP e 150 in totale al giorno.
import { createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const LIMITE_PER_IP = 5;
export const LIMITE_TOTALE = 150;
const CHIAVE_TOTALE = "__totale__";

export type Contatori = {
  /** Incrementa di 1 e restituisce il nuovo valore. Deve essere atomico. */
  incrementa(giorno: string, chiave: string): Promise<number>;
};

/** Data YYYY-MM-DD nel fuso di Roma. */
export function giornoRoma(ora: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ora);
}

/** L'IP non si salva mai in chiaro. Il giorno nel calcolo rende gli hash non collegabili tra giorni diversi. */
export function hashIp(ip: string, sale: string, giorno: string): string {
  return createHmac("sha256", sale).update(`${giorno}|${ip}`).digest("hex");
}

const primo = (v: string | null) => v?.split(",")[0]?.trim() || null;

/**
 * Prima le intestazioni che scrive Vercel (il client non le può impostare),
 * poi x-forwarded-for, che fuori da Vercel il client può falsificare.
 */
export function ipDalleIntestazioni(h: Headers): string {
  return (
    primo(h.get("x-vercel-forwarded-for")) ||
    primo(h.get("x-real-ip")) ||
    primo(h.get("x-forwarded-for")) ||
    "sconosciuto"
  );
}

export type EsitoLimiti = { ok: true } | { ok: false; motivo: "ip" | "totale" };

export async function controllaLimiti(c: Contatori, ip: string, sale: string, ora: Date): Promise<EsitoLimiti> {
  const giorno = giornoRoma(ora);
  if ((await c.incrementa(giorno, hashIp(ip, sale, giorno))) > LIMITE_PER_IP) return { ok: false, motivo: "ip" };
  if ((await c.incrementa(giorno, CHIAVE_TOTALE)) > LIMITE_TOTALE) return { ok: false, motivo: "totale" };
  return { ok: true };
}

export function contatoriNeon(url: string): Contatori {
  const sql = neon(url);
  return {
    async incrementa(giorno, chiave) {
      const righe = (await sql`
        insert into smista_contatori (giorno, chiave, conteggio)
        values (${giorno}, ${chiave}, 1)
        on conflict (giorno, chiave) do update set conteggio = smista_contatori.conteggio + 1
        returning conteggio`) as { conteggio: number }[];
      return Number(righe[0].conteggio);
    },
  };
}

/** Solo per sviluppo e test: in produzione serve il database. */
export function contatoriInMemoria(): Contatori & { leggi(giorno: string, chiave: string): number } {
  const valori = new Map<string, number>();
  return {
    async incrementa(giorno, chiave) {
      const k = `${giorno}|${chiave}`;
      const v = (valori.get(k) ?? 0) + 1;
      valori.set(k, v);
      return v;
    },
    leggi: (giorno, chiave) => valori.get(`${giorno}|${chiave}`) ?? 0,
  };
}
