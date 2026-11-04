import { describe, expect, it } from "vitest";
import { ACCOUNT_DEMO, leggiSessione, PAGINE_PUBBLICHE, serveAccesso } from "./sessione";

describe("sessione demo", () => {
  it("legge una sessione salvata valida", () => {
    const s = leggiSessione(JSON.stringify({ ...ACCOUNT_DEMO, dal: "2026-10-20T10:00:00.000Z" }));
    expect(s?.nome).toBe("Admin demo");
    expect(s?.ruolo).toBe("admin");
  });

  it("scarta dati vuoti, rovinati o di un altro account", () => {
    expect(leggiSessione(null)).toBeNull();
    expect(leggiSessione("{non json")).toBeNull();
    expect(leggiSessione(JSON.stringify({ nome: "Mallory", ruolo: "admin", email: "x@y.z", dal: "ieri" }))).toBeNull();
  });

  it("solo Come funziona si vede senza accesso", () => {
    expect(PAGINE_PUBBLICHE).toEqual(["/come-funziona"]);
    expect(serveAccesso("/come-funziona")).toBe(false);
    expect(serveAccesso("/")).toBe(true);
    expect(serveAccesso("/impostazioni")).toBe(true);
    expect(serveAccesso("/prova")).toBe(true);
  });
});
