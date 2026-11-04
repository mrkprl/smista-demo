import { describe, expect, it } from "vitest";
import { MESSAGGI_DI_ESEMPIO } from "@/data/messaggi";
import type { Analisi } from "./tipi";
import { aggrega, valutaProva } from "./valutazione";

const gas = MESSAGGI_DI_ESEMPIO.find((m) => m.id === "m13")!;
const inglese = MESSAGGI_DI_ESEMPIO.find((m) => m.id === "m12")!;

function analisi(p: Partial<Analisi>): Analisi {
  return {
    categoria: "altro",
    sottotipo: null,
    urgenza: "bassa",
    motivo_urgenza: "",
    pericolo_persone: false,
    intervento_assistenza: false,
    tipo_intervento: "nessuno",
    istruzioni_sospette: false,
    dati_estratti: { nome: null, numero_polizza: null, indirizzo: null, data_evento: null, descrizione: null },
    dati_mancanti: [],
    prossimo_passo: "",
    bozza_risposta: "",
    lingua: "it",
    confidenza: "alta",
    ...p,
  };
}

describe("valutaProva", () => {
  it("riconosce un'analisi giusta del gas", () => {
    const p = valutaProva(gas, analisi({ categoria: "assistenza", urgenza: "alta", pericolo_persone: true }));
    expect(p.ok && p.categoria.giusto && p.urgenza.giusto && p.esito.giusto).toBe(true);
    expect(p.ok && p.regole.pericolo_persone).toBe(true);
  });

  it("segna il pericolo mancato", () => {
    const p = valutaProva(gas, analisi({ categoria: "assistenza", urgenza: "alta" }));
    expect(p.ok && p.regole.pericolo_persone).toBe(false);
    expect(p.ok && p.esito.ottenuto).toBe("bozza");
  });

  it("segna un pericolo dove non c'è", () => {
    const p = valutaProva(inglese, analisi({ categoria: "preventivo", pericolo_persone: true, lingua: "en" }));
    expect(p.ok && p.regole.pericolo_persone).toBe(false);
  });

  it("controlla la lingua", () => {
    const p = valutaProva(inglese, analisi({ categoria: "preventivo", lingua: "it" }));
    expect(p.ok && p.regole.lingua).toBe(false);
  });
});

describe("tecnico", () => {
  it("conta il tecnico sbagliato come errore", () => {
    const p = valutaProva(gas, analisi({ categoria: "assistenza", urgenza: "alta", pericolo_persone: true, tipo_intervento: "idraulico" }));
    expect(p.ok && p.tecnico).toEqual({ atteso: "tecnico_gas_clima", ottenuto: "idraulico", giusto: false });
  });
});

describe("aggrega", () => {
  it("conta giuste, totali, fallite ed errori ripetuti", () => {
    const base = { urgenza: "alta", pericolo_persone: true, tipo_intervento: "tecnico_gas_clima" } as const;
    const giusta = valutaProva(gas, analisi({ ...base, categoria: "assistenza" }));
    const sbagliata = valutaProva(gas, analisi({ ...base, categoria: "sinistro" }));
    const v = aggrega([giusta, sbagliata, sbagliata, { id: "m13", ok: false, errore: "rifiuto" }], {
      eseguitaIl: "2026-10-19T10:00:00Z",
      modello: "m",
      ripetizioni: 4,
    });
    expect(v.prove).toBe(4);
    expect(v.fallite).toBe(1);
    expect(v.messaggi).toBe(1);
    expect(v.categorie).toEqual({ giuste: 1, totali: 3 });
    expect(v.tecnici).toEqual({ giuste: 3, totali: 3 });
    expect(v.errori).toEqual([{ id: "m13", campo: "categoria", atteso: "assistenza", ottenuto: "sinistro", volte: 2 }]);
    expect(v.regole.find((r) => r.nome === "pericolo_persone")).toMatchObject({ giuste: 3, totali: 3 });
  });
});
