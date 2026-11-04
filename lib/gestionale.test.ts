import { describe, expect, it } from "vitest";
import { CITTA, CLIENTI, CONVENZIONATI } from "@/data/gestionale";
import { MESSAGGI_DI_ESEMPIO } from "@/data/messaggi";
import { TIPI_INTERVENTO, type Analisi } from "@/lib/tipi";
import { convenzionatiVicini, daChiedere, distanzaKm, linkTelefono, suggerisciIntervento, telefonoCliente, trovaCliente } from "./gestionale";

function analisi(p: Partial<Analisi> = {}, dati: Partial<Analisi["dati_estratti"]> = {}): Analisi {
  return {
    categoria: "assistenza",
    sottotipo: null,
    urgenza: "alta",
    motivo_urgenza: "",
    pericolo_persone: false,
    intervento_assistenza: true,
    tipo_intervento: "idraulico",
    istruzioni_sospette: false,
    dati_estratti: { nome: null, numero_polizza: null, indirizzo: null, data_evento: null, descrizione: null, ...dati },
    dati_mancanti: [],
    prossimo_passo: "",
    bozza_risposta: "",
    lingua: "it",
    confidenza: "alta",
    ...p,
  };
}

const msg = (mittente: string, testo = "") => ({ mittente, testo });

describe("dati del gestionale", () => {
  it("ogni tipo di tecnico ha almeno un convenzionato in ogni città", () => {
    for (const citta of Object.keys(CITTA)) {
      for (const tipo of TIPI_INTERVENTO.filter((t) => t !== "nessuno")) {
        expect(CONVENZIONATI.some((c) => c.citta === citta && c.tipo === tipo), `${tipo} a ${citta}`).toBe(true);
      }
    }
  });

  it("id, polizze e telefoni sono unici", () => {
    const unici = (xs: (string | null)[]) => new Set(xs.filter(Boolean)).size === xs.filter(Boolean).length;
    expect(unici(CLIENTI.map((c) => c.id))).toBe(true);
    expect(unici(CLIENTI.map((c) => c.polizza))).toBe(true);
    expect(unici(CLIENTI.map((c) => c.telefono))).toBe(true);
    expect(unici(CONVENZIONATI.map((c) => c.id))).toBe(true);
  });
});

describe("trovaCliente", () => {
  it("riconosce il cliente dal numero di polizza, anche scritto in modo diverso", () => {
    const r = trovaCliente(msg("sconosciuto"), analisi({}, { numero_polizza: "ca 48213" }));
    expect(r?.cliente.nome).toBe("Giulia Ferrandi");
    expect(r?.come).toBe("numero di polizza");
  });

  it("trova la polizza nel testo anche se l'AI non l'ha estratta", () => {
    const r = trovaCliente(msg("sconosciuto", "la mia polizza è CA-60218"), analisi());
    expect(r?.cliente.nome).toBe("Elena Sartori");
  });

  it("riconosce il cliente dal numero di telefono di WhatsApp", () => {
    const r = trovaCliente(msg("+39 347 000 1122"), analisi());
    expect(r?.cliente.nome).toBe("Chiara Bosio");
    expect(r?.come).toBe("numero di telefono");
    expect(trovaCliente(msg("3470001122"), analisi())?.cliente.nome).toBe("Chiara Bosio");
  });

  it("riconosce il cliente dal nome del mittente, senza badare a maiuscole e accenti", () => {
    const r = trovaCliente(msg("giulia FERRANDI"), analisi());
    expect(r?.cliente.polizza).toBe("CA-48213");
    expect(r?.come).toBe("nome");
  });

  it("la polizza vince sul telefono", () => {
    const r = trovaCliente(msg("+39 347 000 1122"), analisi({}, { numero_polizza: "CA-48213" }));
    expect(r?.cliente.nome).toBe("Giulia Ferrandi");
  });

  it("non inventa un cliente se non c'è", () => {
    expect(trovaCliente(msg("Il tuo messaggio", "ciao"), analisi())).toBeNull();
    expect(trovaCliente(msg("Emma Clarke"), analisi())).toBeNull();
  });
});

describe("convenzionatiVicini", () => {
  it("calcola le distanze in km", () => {
    expect(distanzaKm(CITTA.Milano, CITTA.Torino)).toBeGreaterThan(120);
    expect(distanzaKm(CITTA.Milano, CITTA.Torino)).toBeLessThan(130);
    expect(distanzaKm(CITTA.Milano, CITTA.Milano)).toBe(0);
  });

  it("solo il tipo giusto, dal più vicino", () => {
    const via = { lat: 45.4985, lon: 9.2245 };
    const v = convenzionatiVicini("idraulico", via);
    expect(v.every((c) => c.tipo === "idraulico")).toBe(true);
    expect(v[0].nome).toBe("Idraulica Ferri");
    for (let i = 1; i < v.length; i++) expect(v[i].km).toBeGreaterThanOrEqual(v[i - 1].km);
  });
});

describe("suggerisciIntervento", () => {
  it("niente suggerimento se non serve un tecnico", () => {
    expect(suggerisciIntervento(msg("Giulia Ferrandi"), analisi({ intervento_assistenza: false, tipo_intervento: "nessuno" }))).toBeNull();
  });

  it("con il cliente in gestionale usa l'indirizzo dell'immobile assicurato", () => {
    const s = suggerisciIntervento(msg("+39 347 000 1122"), analisi({ tipo_intervento: "fabbro_falegname" }));
    expect(s?.posizione?.fonte).toBe("gestionale");
    expect(s?.convenzionati[0].citta).toBe("Torino");
    expect(s?.convenzionati[0].nome).toBe("Fabbro Rolando");
  });

  it("segnala se l'indirizzo del messaggio non è quello in polizza", () => {
    const s = suggerisciIntervento(
      msg("+39 347 000 1122"),
      analisi({ tipo_intervento: "fabbro_falegname" }, { indirizzo: "Via Roma 3, Torino" }),
    );
    expect(s?.indirizzoDiverso).toBe(true);
    const uguale = suggerisciIntervento(
      msg("+39 347 000 1122"),
      analisi({ tipo_intervento: "fabbro_falegname" }, { indirizzo: "via nizza 112 a Torino" }),
    );
    expect(uguale?.indirizzoDiverso).toBe(false);
  });

  it("senza cliente usa la città scritta nel messaggio", () => {
    const s = suggerisciIntervento(msg("Il tuo messaggio"), analisi({}, { indirizzo: "via Indipendenza 5, Bologna" }));
    expect(s?.cliente).toBeNull();
    expect(s?.posizione?.fonte).toBe("città");
    expect(s?.convenzionati[0].citta).toBe("Bologna");
  });

  it("senza cliente né città non sceglie a caso", () => {
    const s = suggerisciIntervento(msg("Il tuo messaggio"), analisi());
    expect(s?.posizione).toBeNull();
    expect(s?.convenzionati).toEqual([]);
  });

  it("negli esempi trova il cliente per i quattro interventi", () => {
    for (const id of ["m01", "m02", "m10", "m13"]) {
      const m = MESSAGGI_DI_ESEMPIO.find((x) => x.id === id)!;
      const s = suggerisciIntervento(m, analisi({ tipo_intervento: m.attesi.tecnico }, { numero_polizza: id === "m01" ? "CA-48213" : null }));
      expect(s?.cliente, id).not.toBeNull();
      expect(s?.convenzionati[0].tipo, id).toBe(m.attesi.tecnico);
      expect(s?.convenzionati[0].citta, id).toBe(s?.cliente?.cliente.citta);
    }
  });
});

describe("daChiedere", () => {
  const giulia = trovaCliente(msg("Giulia Ferrandi"), analisi())!;

  it("toglie quello che il gestionale sa già", () => {
    const r = daChiedere(["nome e cognome", "numero di polizza", "indirizzo dell'immobile", "numero del sinistro"], giulia, "email");
    expect(r.daChiedere).toEqual(["numero del sinistro"]);
    expect(r.giaNoti).toEqual(["nome e cognome", "numero di polizza", "indirizzo dell'immobile"]);
  });

  it("il telefono è noto se il cliente scrive da WhatsApp o è in gestionale", () => {
    expect(daChiedere(["recapito telefonico"], null, "whatsapp").daChiedere).toEqual([]);
    expect(daChiedere(["numero di telefono"], giulia, "email").daChiedere).toEqual(["numero di telefono"]);
    const chiara = trovaCliente(msg("+39 347 000 1122"), analisi())!;
    expect(daChiedere(["numero di telefono"], chiara, "email").daChiedere).toEqual([]);
  });

  it("senza cliente non toglie nulla (tranne il telefono su WhatsApp)", () => {
    expect(daChiedere(["nome", "numero di polizza"], null, "email").daChiedere).toEqual(["nome", "numero di polizza"]);
  });

  it("non confonde il numero del sinistro con il numero di polizza", () => {
    expect(daChiedere(["numero o riferimento del sinistro"], giulia, "email").daChiedere).toEqual([
      "numero o riferimento del sinistro",
    ]);
  });
});

describe("telefoni", () => {
  it("trasforma i numeri in link per chiamare", () => {
    expect(linkTelefono("+39 347 000 1122")).toBe("tel:+393470001122");
    expect(linkTelefono("3470001122")).toBe("tel:+393470001122");
    expect(linkTelefono("02 0000 1101")).toBe("tel:+390200001101");
    expect(linkTelefono("011 0000 2301")).toBe("tel:+3901100002301");
  });

  it("il numero del cliente: WhatsApp prima, poi il gestionale", () => {
    expect(telefonoCliente({ canale: "whatsapp", mittente: "+39 340 000 7788" }, null)).toEqual({
      numero: "+39 340 000 7788",
      chiama: "tel:+393400007788",
      whatsapp: "https://wa.me/393400007788",
    });
    const chiara = trovaCliente(msg("+39 347 000 1122"), analisi())!;
    expect(telefonoCliente({ canale: "email", mittente: "chiara@example.com" }, chiara)?.chiama).toBe("tel:+393470001122");
    expect(telefonoCliente({ canale: "email", mittente: "chiara@example.com" }, chiara)?.whatsapp).toBeNull();
  });

  it("senza numero non inventa nulla", () => {
    const giulia = trovaCliente(msg("Giulia Ferrandi"), analisi())!;
    expect(telefonoCliente({ canale: "email", mittente: "Giulia Ferrandi" }, giulia)).toBeNull();
    expect(telefonoCliente({ canale: "prova", mittente: "Il tuo messaggio" }, null)).toBeNull();
  });
});
