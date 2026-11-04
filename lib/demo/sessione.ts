"use client";
// Accesso di prova: un solo account demo, nessuna password, ricordato in questo browser.
// Non è sicurezza: serve a mostrare come l'operatore entra nello strumento.
import { useSyncExternalStore } from "react";
import * as z from "zod/v4";

const CHIAVE = "smista:sessione:v1";

export const ACCOUNT_DEMO = { nome: "Admin demo", ruolo: "admin", email: "admin@smista.demo" } as const;

const SchemaSessione = z.object({
  nome: z.literal(ACCOUNT_DEMO.nome),
  ruolo: z.literal(ACCOUNT_DEMO.ruolo),
  email: z.literal(ACCOUNT_DEMO.email),
  dal: z.iso.datetime(),
});

export type Sessione = z.infer<typeof SchemaSessione>;

/** Le pagine che si vedono anche senza accesso. */
export const PAGINE_PUBBLICHE = ["/come-funziona"] as const;

export function serveAccesso(percorso: string): boolean {
  return !(PAGINE_PUBBLICHE as readonly string[]).includes(percorso);
}

export function leggiSessione(grezzo: string | null): Sessione | null {
  if (!grezzo) return null;
  try {
    const r = SchemaSessione.safeParse(JSON.parse(grezzo));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

let sessione: Sessione | null = null;
let caricata = false;
const ascoltatori = new Set<() => void>();

function carica() {
  if (caricata) return;
  caricata = true;
  try {
    sessione = leggiSessione(window.localStorage.getItem(CHIAVE));
  } catch {
    sessione = null;
  }
}

function cambia(nuova: Sessione | null) {
  sessione = nuova;
  caricata = true;
  try {
    if (nuova) window.localStorage.setItem(CHIAVE, JSON.stringify(nuova));
    else window.localStorage.removeItem(CHIAVE);
  } catch {
    // Navigazione privata: l'accesso vale finché la pagina resta aperta.
  }
  ascoltatori.forEach((a) => a());
}

function iscrivi(a: () => void) {
  ascoltatori.add(a);
  return () => ascoltatori.delete(a);
}

/** undefined finché il browser non ha letto la sessione: così non lampeggia la schermata di accesso. */
export function useSessione(): Sessione | null | undefined {
  return useSyncExternalStore(
    iscrivi,
    () => {
      carica();
      return sessione;
    },
    () => undefined,
  );
}

export const accesso = {
  entra() {
    cambia({ ...ACCOUNT_DEMO, dal: new Date().toISOString() });
  },
  esci() {
    cambia(null);
  },
};
