"use client";
// Stato della demo nel browser di chi guarda. Livelli, azioni, bozze e correzioni in localStorage;
// i messaggi di "Prova tu" solo in memoria (si perdono ricaricando, per scelta).
import { useSyncExternalStore } from "react";
import * as z from "zod/v4";
import type { AzioneOperatore } from "@/lib/regole";
import { CATEGORIE, IMPOSTAZIONI_INIZIALI, LIVELLI, URGENZE, type Analisi, type Categoria, type Impostazioni, type Livello, type Urgenza } from "@/lib/tipi";
import type { MessaggioInCoda, ScelteOperatore } from "./coda";

const CHIAVE = "smista:stato:v1";

const SchemaScelte = z.object({
  impostazioni: z.record(z.enum(CATEGORIE), z.enum(LIVELLI)),
  azioni: z.record(z.string(), z.enum(["approvata", "scartata", "chiusa"])),
  bozze: z.record(z.string(), z.string().max(5000)),
  correzioni: z.record(z.string(), z.object({ categoria: z.enum(CATEGORIE).optional(), urgenza: z.enum(URGENZE).optional() })),
});

export type Provato = { messaggio: MessaggioInCoda; analisi: Analisi };
export type StatoDemo = ScelteOperatore & { provati: Provato[] };

const INIZIALE: StatoDemo = { impostazioni: IMPOSTAZIONI_INIZIALI, azioni: {}, bozze: {}, correzioni: {}, provati: [] };

let stato: StatoDemo = INIZIALE;
let caricato = false;
const ascoltatori = new Set<() => void>();

function carica() {
  if (caricato) return;
  caricato = true;
  try {
    const grezzo = window.localStorage.getItem(CHIAVE);
    if (!grezzo) return;
    const r = SchemaScelte.safeParse(JSON.parse(grezzo));
    if (r.success) {
      stato = { ...INIZIALE, ...r.data, impostazioni: { ...IMPOSTAZIONI_INIZIALI, ...r.data.impostazioni } };
    }
  } catch {
    // localStorage non disponibile o dati rovinati: si parte dallo stato iniziale.
  }
}

function salva() {
  try {
    const { impostazioni, azioni, bozze, correzioni } = stato;
    const daSalvare: ScelteOperatore = { impostazioni, azioni, bozze, correzioni };
    window.localStorage.setItem(CHIAVE, JSON.stringify(daSalvare));
  } catch {
    // Navigazione privata o spazio pieno: lo stato resta valido finché la pagina è aperta.
  }
}

function aggiorna(f: (s: StatoDemo) => StatoDemo) {
  carica();
  stato = f(stato);
  salva();
  ascoltatori.forEach((a) => a());
}

function iscrivi(a: () => void) {
  ascoltatori.add(a);
  return () => ascoltatori.delete(a);
}

export function useStatoDemo(): StatoDemo {
  return useSyncExternalStore(
    iscrivi,
    () => {
      carica();
      return stato;
    },
    () => INIZIALE,
  );
}

export const azioni = {
  impostaLivello(categoria: Categoria, livello: Livello) {
    aggiorna((s) => ({ ...s, impostazioni: { ...s.impostazioni, [categoria]: livello } as Impostazioni }));
  },
  impostaAzione(id: string, azione: AzioneOperatore | null) {
    aggiorna((s) => {
      const nuove = { ...s.azioni };
      if (azione) nuove[id] = azione;
      else delete nuove[id];
      return { ...s, azioni: nuove };
    });
  },
  impostaBozza(id: string, testo: string) {
    aggiorna((s) => ({ ...s, bozze: { ...s.bozze, [id]: testo } }));
  },
  correggi(id: string, campo: "categoria" | "urgenza", valore: Categoria | Urgenza | null) {
    aggiorna((s) => {
      const c = { ...(s.correzioni[id] ?? {}) } as Record<string, string>;
      if (valore) c[campo] = valore;
      else delete c[campo];
      return { ...s, correzioni: { ...s.correzioni, [id]: c } };
    });
  },
  aggiungiProvato(p: Provato) {
    aggiorna((s) => ({ ...s, provati: [...s.provati, p] }));
  },
  ricomincia() {
    aggiorna(() => INIZIALE);
  },
};
