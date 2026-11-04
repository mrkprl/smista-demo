import { describe, expect, it, vi } from "vitest";
import { ErroreAnalisi } from "./ai/analizza";
import { gestisciAnalisi, type Dipendenze } from "./api-analizza";
import { contatoriInMemoria } from "./limiti";
import type { Analisi } from "./tipi";

const ANALISI = { categoria: "altro" } as Analisi;

function dipendenze(p: Partial<Dipendenze> = {}): Dipendenze {
  return {
    analizza: vi.fn().mockResolvedValue(ANALISI),
    contatori: contatoriInMemoria(),
    sale: "sale",
    produzione: false,
    chiaveApi: true,
    ora: () => new Date("2026-10-19T10:00:00Z"),
    ...p,
  };
}

function richiesta(corpo: unknown, ip = "203.0.113.7", extra: Record<string, string> = {}) {
  return new Request("http://localhost/api/analizza", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...extra },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

describe("POST /api/analizza", () => {
  it("analizza un messaggio valido", async () => {
    const d = dipendenze();
    const r = await gestisciAnalisi(richiesta({ testo: "  ho un problema  " }), d);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ analisi: ANALISI });
    expect(d.analizza).toHaveBeenCalledWith("ho un problema");
  });

  it("il sesto tentativo dallo stesso IP viene bloccato", async () => {
    const d = dipendenze();
    for (let i = 0; i < 5; i++) expect((await gestisciAnalisi(richiesta({ testo: "ciao" }), d)).status).toBe(200);
    const r = await gestisciAnalisi(richiesta({ testo: "ciao" }), d);
    expect(r.status).toBe(429);
    expect((await r.json()).errore).toMatch(/5 analisi/);
    expect(d.analizza).toHaveBeenCalledTimes(5);
  });

  it("in produzione senza DATABASE_URL risponde 503", async () => {
    const d = dipendenze({ produzione: true, contatori: null });
    const r = await gestisciAnalisi(richiesta({ testo: "ciao" }), d);
    expect(r.status).toBe(503);
    expect(d.analizza).not.toHaveBeenCalled();
  });

  it("in produzione senza sale risponde 503", async () => {
    const r = await gestisciAnalisi(richiesta({ testo: "ciao" }), dipendenze({ produzione: true, sale: "" }));
    expect(r.status).toBe(503);
  });

  it("senza chiave API risponde 503", async () => {
    const r = await gestisciAnalisi(richiesta({ testo: "ciao" }), dipendenze({ chiaveApi: false }));
    expect(r.status).toBe(503);
  });

  it.each([
    ["testo troppo lungo", { testo: "a".repeat(1501) }],
    ["testo vuoto", { testo: "   " }],
    ["testo non stringa", { testo: 42 }],
    ["JSON non valido", "{non json"],
    ["corpo senza testo", {}],
  ])("rifiuta %s con 400", async (_nome, corpo) => {
    const d = dipendenze();
    const r = await gestisciAnalisi(richiesta(corpo), d);
    expect(r.status).toBe(400);
    expect(d.analizza).not.toHaveBeenCalled();
  });

  it("accetta esattamente 1.500 caratteri", async () => {
    const r = await gestisciAnalisi(richiesta({ testo: "a".repeat(1500) }), dipendenze());
    expect(r.status).toBe(200);
  });

  it("rifiuta corpi enormi senza leggerli come JSON", async () => {
    const r = await gestisciAnalisi(richiesta("x".repeat(20_000)), dipendenze());
    expect(r.status).toBe(413);
  });

  it("riporta gli errori dell'AI in italiano senza dettagli interni", async () => {
    const d = dipendenze({ analizza: vi.fn().mockRejectedValue(new ErroreAnalisi("rifiuto")) });
    const r = await gestisciAnalisi(richiesta({ testo: "ciao" }), d);
    expect(r.status).toBe(422);
    expect((await r.json()).errore).toMatch(/rifiutata/);
  });

  it("su un errore imprevisto risponde 500 generico", async () => {
    const d = dipendenze({ analizza: vi.fn().mockRejectedValue(new Error("segreto interno")) });
    const r = await gestisciAnalisi(richiesta({ testo: "ciao" }), d);
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("segreto");
  });

  it("se il database non risponde, non analizza", async () => {
    const d = dipendenze({ contatori: { incrementa: vi.fn().mockRejectedValue(new Error("db giù")) } });
    const r = await gestisciAnalisi(richiesta({ testo: "ciao" }), d);
    expect(r.status).toBe(503);
    expect(d.analizza).not.toHaveBeenCalled();
  });

  describe("provenienza della richiesta", () => {
    it("accetta le richieste dalla stessa origine", async () => {
      const r = await gestisciAnalisi(
        richiesta({ testo: "ciao" }, undefined, { origin: "http://localhost", host: "localhost" }),
        dipendenze(),
      );
      expect(r.status).toBe(200);
    });

    it("rifiuta un altro sito senza consumare la quota", async () => {
      const d = dipendenze();
      const r = await gestisciAnalisi(
        richiesta({ testo: "ciao" }, undefined, { origin: "https://sito-altrui.example", host: "localhost" }),
        d,
      );
      expect(r.status).toBe(403);
      expect((await r.json()).errore).toMatch(/[a-z]/);
      expect(d.analizza).not.toHaveBeenCalled();
      const c = d.contatori as ReturnType<typeof contatoriInMemoria>;
      expect(c.leggi("2026-10-19", "__totale__")).toBe(0);
    });

    it("rifiuta se il browser dice che la richiesta arriva da un altro sito", async () => {
      const r = await gestisciAnalisi(
        richiesta({ testo: "ciao" }, undefined, { "sec-fetch-site": "cross-site" }),
        dipendenze(),
      );
      expect(r.status).toBe(403);
    });

    it("rifiuta un Origin non valido", async () => {
      const r = await gestisciAnalisi(
        richiesta({ testo: "ciao" }, undefined, { origin: "null", host: "localhost" }),
        dipendenze(),
      );
      expect(r.status).toBe(403);
    });

    it("usa x-forwarded-host quando c'è un proxy davanti", async () => {
      const r = await gestisciAnalisi(
        richiesta({ testo: "ciao" }, undefined, {
          origin: "https://smista.example",
          host: "interno:3000",
          "x-forwarded-host": "smista.example",
        }),
        dipendenze(),
      );
      expect(r.status).toBe(200);
    });
  });
});
