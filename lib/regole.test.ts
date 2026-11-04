import { describe, expect, it } from "vitest";
import {
  avvisiPer,
  decidiEsito,
  giorniAllaScadenzaReclamo,
  ordinaCoda,
  riepilogo,
  scadenzaInRosso,
  statoDi,
  azioneRiapri,
  testoFissoPer,
  trovaPromesse,
  type VoceCoda,
} from "./regole";
import { TESTO_FISSO_GAS, TESTO_FISSO_PERICOLO } from "./testi-fissi";
import { IMPOSTAZIONI_INIZIALI, type Analisi, type Impostazioni } from "./tipi";

const GIORNO = 24 * 60 * 60 * 1000;
const ORA = new Date("2026-10-19T10:00:00Z");

function analisi(parziale: Partial<Analisi> = {}): Analisi {
  return {
    categoria: "preventivo",
    sottotipo: null,
    urgenza: "bassa",
    motivo_urgenza: "Richiesta informativa",
    pericolo_persone: false,
    intervento_assistenza: false,
    tipo_intervento: "nessuno",
    istruzioni_sospette: false,
    dati_estratti: { nome: null, numero_polizza: null, indirizzo: null, data_evento: null, descrizione: null },
    dati_mancanti: [],
    prossimo_passo: "Inviare le informazioni",
    bozza_risposta: "Gentile cliente, per prepararti un preventivo ci servono alcuni dati. Il team assistenza",
    lingua: "it",
    confidenza: "alta",
    ...parziale,
  };
}

function tutteA(livello: Impostazioni[keyof Impostazioni]): Impostazioni {
  return Object.fromEntries(Object.keys(IMPOSTAZIONI_INIZIALI).map((c) => [c, livello])) as Impostazioni;
}

describe("trovaPromesse", () => {
  it.each([
    "Il danno è coperto dalla polizza",
    "Sei coperto anche per la bici",
    "Siete coperti",
    "Rimborseremo la rata",
    "La richiesta è stata approvata",
    "Il sinistro verrà liquidato",
    "E' coperto",
    "Good news: you are covered",
    "You're covered for theft",
    "We will reimburse you",
    "We'll refund the second payment",
    "Your claim has been approved",
    "La casa è coperta anche per la grandine",
    "I danni sono coperti",
    "Le spese sono coperte",
    "Ti rimborsiamo entro 10 giorni",
    "La rata le sarà rimborsata",
    "Vi risarciremo il danno",
  ])("trova una promessa in %j", (bozza) => {
    expect(trovaPromesse(bozza).length).toBeGreaterThan(0);
  });

  it("non distingue maiuscole e apostrofi tipografici", () => {
    expect(trovaPromesse("RIMBORSEREMO")).toEqual(["rimborseremo"]);
    expect(trovaPromesse("You’re covered")).toEqual(["you're covered"]);
  });

  it.each([
    "Per sapere se la bici rientra nella polizza, verifichiamo le condizioni e ti rispondiamo.",
    "Ci servono il numero di polizza e la data del trasferimento.",
    "Could you tell us the size of the flat?",
  ])("non segnala %j", (bozza) => {
    expect(trovaPromesse(bozza)).toEqual([]);
  });
});

describe("scadenza dei reclami", () => {
  it("dà 45 giorni dalla ricezione", () => {
    expect(giorniAllaScadenzaReclamo(ORA.toISOString(), ORA)).toBe(45);
  });

  it("conta i giorni interi passati", () => {
    const ricevuto = new Date(ORA.getTime() - 37 * GIORNO - 3600_000).toISOString();
    expect(giorniAllaScadenzaReclamo(ricevuto, ORA)).toBe(8);
  });

  it("va sotto zero quando è scaduto", () => {
    const ricevuto = new Date(ORA.getTime() - 50 * GIORNO).toISOString();
    expect(giorniAllaScadenzaReclamo(ricevuto, ORA)).toBe(-5);
  });

  it("è rossa sotto i 10 giorni", () => {
    expect(scadenzaInRosso(10)).toBe(false);
    expect(scadenzaInRosso(9)).toBe(true);
    expect(scadenzaInRosso(0)).toBe(true);
    expect(scadenzaInRosso(-3)).toBe(true);
  });
});

describe("decidiEsito", () => {
  it("parte in automatico se tutte le condizioni sono vere", () => {
    expect(decidiEsito(analisi(), IMPOSTAZIONI_INIZIALI)).toEqual({ esito: "automatico", motivo: null });
  });

  it("segue il livello della categoria", () => {
    expect(decidiEsito(analisi({ categoria: "sinistro" }), IMPOSTAZIONI_INIZIALI).esito).toBe("bozza");
    expect(decidiEsito(analisi({ categoria: "reclamo" }), IMPOSTAZIONI_INIZIALI).esito).toBe("solo_persona");
  });

  it("con confidenza media scende a bozza con il motivo", () => {
    expect(decidiEsito(analisi({ confidenza: "media" }), IMPOSTAZIONI_INIZIALI)).toEqual({
      esito: "bozza",
      motivo: "non automatico: confidenza media",
    });
  });

  it("elenca tutti i motivi", () => {
    const r = decidiEsito(
      analisi({ confidenza: "bassa", urgenza: "alta", bozza_risposta: "Sei coperto." }),
      IMPOSTAZIONI_INIZIALI,
    );
    expect(r.esito).toBe("bozza");
    expect(r.motivo).toBe(
      "non automatico: confidenza bassa, urgenza alta, la bozza parla di coperture o rimborsi",
    );
  });

  it("urgenza alta non parte mai in automatico, qualunque sia il livello", () => {
    for (const categoria of Object.keys(IMPOSTAZIONI_INIZIALI) as Analisi["categoria"][]) {
      const r = decidiEsito(analisi({ categoria, urgenza: "alta" }), tutteA("automatico"));
      expect(r.esito).not.toBe("automatico");
    }
  });

  it("pericolo per le persone dà sempre il testo fisso, anche se la categoria è automatica", () => {
    const r = decidiEsito(analisi({ pericolo_persone: true, urgenza: "bassa" }), tutteA("automatico"));
    expect(r.esito).toBe("testo_fisso");
  });

  it("pericolo vince anche su solo persona e istruzioni sospette", () => {
    const r = decidiEsito(
      analisi({ pericolo_persone: true, istruzioni_sospette: true }),
      tutteA("solo_persona"),
    );
    expect(r.esito).toBe("testo_fisso");
  });

  it("istruzioni sospette danno sempre solo persona", () => {
    for (const livello of ["automatico", "bozza", "solo_persona"] as const) {
      const r = decidiEsito(analisi({ istruzioni_sospette: true }), tutteA(livello));
      expect(r.esito).toBe("solo_persona");
      expect(r.motivo).toBe("istruzioni sospette nel messaggio");
    }
  });

  it("una bozza con promesse non parte in automatico", () => {
    const r = decidiEsito(analisi({ bozza_risposta: "Rimborseremo tutto." }), IMPOSTAZIONI_INIZIALI);
    expect(r.esito).toBe("bozza");
  });
});

describe("statoDi", () => {
  it("automatico → automatica, testo fisso → testo_fisso", () => {
    expect(statoDi({ esito: "automatico", motivo: null }, analisi())).toBe("automatica");
    expect(statoDi({ esito: "testo_fisso", motivo: null }, analisi())).toBe("testo_fisso");
  });

  it("solo persona e confidenza bassa → da rivedere", () => {
    expect(statoDi({ esito: "solo_persona", motivo: null }, analisi())).toBe("da_rivedere");
    expect(statoDi({ esito: "bozza", motivo: null }, analisi({ confidenza: "bassa" }))).toBe("da_rivedere");
  });

  it("bozza normale → da vedere", () => {
    expect(statoDi({ esito: "bozza", motivo: null }, analisi({ confidenza: "media" }))).toBe("da_vedere");
  });

  it("una pratica chiusa resta chiusa, anche se la risposta era partita in automatico", () => {
    expect(statoDi({ esito: "bozza", motivo: null }, analisi(), "chiusa")).toBe("chiusa");
    expect(statoDi({ esito: "automatico", motivo: null }, analisi(), "chiusa")).toBe("chiusa");
  });

  it("riaprendo una pratica chiusa si torna in attesa di risposta, o alla risposta automatica", () => {
    expect(azioneRiapri("bozza")).toBe("approvata");
    expect(azioneRiapri("testo_fisso")).toBe("approvata");
    expect(azioneRiapri("automatico")).toBeNull();
  });

  it("l'azione dell'operatore vince", () => {
    expect(statoDi({ esito: "bozza", motivo: null }, analisi(), "approvata")).toBe("approvata");
    expect(statoDi({ esito: "automatico", motivo: null }, analisi(), "scartata")).toBe("scartata");
  });
});

describe("avvisiPer", () => {
  it("raccoglie gli avvisi del §6", () => {
    const tipi = avvisiPer(
      analisi({
        pericolo_persone: true,
        istruzioni_sospette: true,
        confidenza: "bassa",
        bozza_risposta: "è coperto",
      }),
    ).map((a) => a.tipo);
    expect(tipi).toEqual(["pericolo_persone", "istruzioni_sospette", "promesse", "confidenza_bassa"]);
  });

  it("nessun avviso per un'analisi pulita", () => {
    expect(avvisiPer(analisi())).toEqual([]);
  });
});

describe("testoFissoPer", () => {
  it("usa il testo del gas se si parla di gas", () => {
    expect(testoFissoPer("sento puzza di gas in cucina", null)).toBe(TESTO_FISSO_GAS);
    expect(testoFissoPer("odore strano", "fuga di gas")).toBe(TESTO_FISSO_GAS);
  });

  it("altrimenti il testo generico", () => {
    expect(testoFissoPer("esce fumo dalla presa", "incendio")).toBe(TESTO_FISSO_PERICOLO);
  });

  it("con un altro pericolo vince il testo generico, anche se compare la parola gas", () => {
    expect(testoFissoPer("ho pagato la bolletta del gas ma ora esce fumo dal quadro", null)).toBe(TESTO_FISSO_PERICOLO);
    expect(testoFissoPer("sento gas", "fuga di gas e incendio")).toBe(TESTO_FISSO_PERICOLO);
    expect(testoFissoPer("there is smoke in the kitchen", null)).toBe(TESTO_FISSO_PERICOLO);
  });

  it("riconosce il gas anche in inglese", () => {
    expect(testoFissoPer("I smell gas in the kitchen", null)).toBe(TESTO_FISSO_GAS);
  });

  it("non scambia parole che contengono 'gas'", () => {
    expect(testoFissoPer("la gastronomia sotto casa ha preso fuoco", null)).toBe(TESTO_FISSO_PERICOLO);
  });
});

describe("ordinaCoda", () => {
  function voce(id: string, minutiFa: number, a: Partial<Analisi> | null): VoceCoda {
    return {
      id,
      ricevutoIl: new Date(ORA.getTime() - minutiFa * 60_000).toISOString(),
      analisi: a === null ? null : analisi(a),
    };
  }

  it("pericolo → alta → reclami per scadenza → media → bassa → senza analisi", () => {
    const coda = [
      voce("bassa", 10, { urgenza: "bassa" }),
      voce("senza", 5, null),
      voce("media", 10, { urgenza: "media" }),
      voce("reclamo-lontano", 60 * 24 * 2, { categoria: "reclamo", urgenza: "media" }),
      voce("reclamo-vicino", 60 * 24 * 40, { categoria: "reclamo", urgenza: "alta" }),
      voce("alta", 10, { urgenza: "alta" }),
      voce("gas", 1, { pericolo_persone: true, urgenza: "alta" }),
    ];
    expect(ordinaCoda(coda, ORA).map((v) => v.id)).toEqual([
      "gas",
      "alta",
      "reclamo-vicino",
      "reclamo-lontano",
      "media",
      "bassa",
      "senza",
    ]);
  });

  it("a parità il più vecchio prima", () => {
    const coda = [voce("nuovo", 5, { urgenza: "alta" }), voce("vecchio", 50, { urgenza: "alta" })];
    expect(ordinaCoda(coda, ORA).map((v) => v.id)).toEqual(["vecchio", "nuovo"]);
  });

  it("non modifica l'array di partenza", () => {
    const coda = [voce("b", 1, { urgenza: "bassa" }), voce("a", 1, { urgenza: "alta" })];
    ordinaCoda(coda, ORA);
    expect(coda.map((v) => v.id)).toEqual(["b", "a"]);
  });
});

describe("riepilogo", () => {
  it("costruisce la frase dai numeri della coda", () => {
    const stati = [
      ...Array(3).fill("automatica"),
      "testo_fisso",
      ...Array(5).fill("da_vedere"),
      ...Array(4).fill("da_rivedere"),
    ];
    expect(riepilogo(stati).frase).toBe(
      "13 messaggi. 3 hanno già una risposta automatica, 1 aspetta una telefonata, 9 aspettano te.",
    );
  });

  it("usa il singolare e cita i gestiti", () => {
    expect(riepilogo(["automatica", "da_vedere", "approvata", "scartata"]).frase).toBe(
      "4 messaggi. 1 ha già una risposta automatica, 1 aspetta te, 2 gestiti da te.",
    );
  });

  it("salta le parti a zero", () => {
    expect(riepilogo(["da_vedere"]).frase).toBe("1 messaggio. 1 aspetta te.");
    expect(riepilogo([]).frase).toBe("Nessun messaggio.");
    expect(riepilogo(["approvata"]).frase).toBe("1 messaggio. 1 gestito da te.");
  });

  it("conta gli automatici", () => {
    expect(riepilogo(["automatica", "automatica", "testo_fisso"]).automatici).toBe(2);
  });
});
