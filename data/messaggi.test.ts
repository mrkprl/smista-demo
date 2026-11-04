import { describe, expect, it } from "vitest";
import { giorniAllaScadenzaReclamo, scadenzaInRosso } from "@/lib/regole";
import { CATEGORIE, URGENZE } from "@/lib/tipi";
import { MESSAGGI_DI_ESEMPIO, messaggioConOrario } from "./messaggi";

describe("messaggi di esempio", () => {
  it("sono 13 con id unici", () => {
    expect(MESSAGGI_DI_ESEMPIO).toHaveLength(13);
    expect(new Set(MESSAGGI_DI_ESEMPIO.map((m) => m.id)).size).toBe(13);
  });

  it("hanno valori attesi validi", () => {
    for (const m of MESSAGGI_DI_ESEMPIO) {
      expect(CATEGORIE).toContain(m.attesi.categoria);
      expect(URGENZE).toContain(m.attesi.urgenza);
      expect(m.testo.length).toBeGreaterThan(0);
      expect(m.testo.length).toBeLessThanOrEqual(1500);
    }
  });

  it("solo 3, 8 e 12 sono attesi in automatico (§12)", () => {
    const automatici = MESSAGGI_DI_ESEMPIO.filter((m) => m.attesi.esito === "automatico").map((m) => m.id);
    expect(automatici).toEqual(["m03", "m08", "m12"]);
  });

  it("il reclamo mostra il contatore in rosso", () => {
    const ora = new Date("2026-10-19T10:00:00Z");
    const reclamo = MESSAGGI_DI_ESEMPIO.find((m) => m.attesi.categoria === "reclamo")!;
    const giorni = giorniAllaScadenzaReclamo(messaggioConOrario(reclamo, ora).ricevutoIl, ora);
    expect(giorni).toBe(8);
    expect(scadenzaInRosso(giorni)).toBe(true);
  });
});
