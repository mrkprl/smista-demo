import { describe, expect, it } from "vitest";
import analisiScritteAMano from "@/data/analisi-esempi.json";
import { MESSAGGI_DI_ESEMPIO } from "@/data/messaggi";
import { giorniAllaScadenzaReclamo, riepilogo } from "@/lib/regole";
import { IMPOSTAZIONI_INIZIALI, type Analisi } from "@/lib/tipi";
import { costruisciCoda, ORA_RIFERIMENTO, type ScelteOperatore } from "./coda";

// Usa le analisi del file solo se sono quelle scritte a mano, che seguono i valori attesi.
// Con quelle vere dell'AI i criteri si misurano con `npm run valuta`.
const fixture = analisiScritteAMano as unknown as { origine: string; analisi: Record<string, Analisi> };
const descriviSe = fixture.origine === "scritte_a_mano" ? describe : describe.skip;

const elementi = MESSAGGI_DI_ESEMPIO.map((m) => ({ messaggio: m, analisi: fixture.analisi[m.id] }));
const scelte = (p: Partial<ScelteOperatore> = {}): ScelteOperatore => ({
  impostazioni: IMPOSTAZIONI_INIZIALI,
  azioni: {},
  bozze: {},
  correzioni: {},
  ...p,
});

descriviSe("coda della demo (criteri §12)", () => {
  it("il gas è in cima con il testo fisso", () => {
    const coda = costruisciCoda(elementi, scelte());
    expect(coda[0].messaggio.id).toBe("m13");
    expect(coda[0].stato).toBe("testo_fisso");
  });

  it("solo 3, 8 e 12 partono in automatico", () => {
    const coda = costruisciCoda(elementi, scelte());
    expect(coda.filter((v) => v.stato === "automatica").map((v) => v.messaggio.id).sort()).toEqual(["m03", "m08", "m12"]);
  });

  it("il reclamo ha 8 giorni e le istruzioni sospette sono da rivedere", () => {
    const coda = costruisciCoda(elementi, scelte());
    const reclamo = coda.find((v) => v.messaggio.id === "m06")!;
    expect(giorniAllaScadenzaReclamo(reclamo.ricevutoIl, ORA_RIFERIMENTO)).toBe(8);
    expect(coda.find((v) => v.messaggio.id === "m11")!.stato).toBe("da_rivedere");
  });

  it("la frase di riepilogo torna con l'esempio della specifica", () => {
    expect(riepilogo(costruisciCoda(elementi, scelte()).map((v) => v.stato)).frase).toBe(
      "13 messaggi. 3 hanno già una risposta automatica, 1 aspetta una telefonata, 9 aspettano te.",
    );
  });

  it("cambiando il livello di una categoria la coda si aggiorna", () => {
    const coda = costruisciCoda(
      elementi,
      scelte({ impostazioni: { ...IMPOSTAZIONI_INIZIALI, preventivo: "bozza", disdetta: "automatico" } }),
    );
    const stato = (id: string) => coda.find((v) => v.messaggio.id === id)!.stato;
    expect(stato("m12")).toBe("da_vedere");
    expect(stato("m07")).toBe("automatica"); // disdetta: urgenza media e confidenza alta, quindi parte
  });

  it("urgenza alta non parte mai in automatico, anche con tutte le categorie in automatico", () => {
    const tutte = Object.fromEntries(Object.keys(IMPOSTAZIONI_INIZIALI).map((c) => [c, "automatico"])) as ScelteOperatore["impostazioni"];
    const coda = costruisciCoda(elementi, scelte({ impostazioni: tutte }));
    for (const v of coda) if (v.analisi?.urgenza === "alta") expect(v.stato).not.toBe("automatica");
  });

  it("le correzioni dell'operatore cambiano la decisione e restano visibili", () => {
    const coda = costruisciCoda(elementi, scelte({ correzioni: { m03: { urgenza: "alta" } } }));
    const v = coda.find((x) => x.messaggio.id === "m03")!;
    expect(v.stato).toBe("da_vedere");
    expect(v.correzione).toEqual({ urgenza: "alta" });
    expect(v.originale!.urgenza).toBe("bassa");
  });

  it("una bozza modificata con una promessa fa comparire l'avviso", () => {
    const coda = costruisciCoda(elementi, scelte({ bozze: { m04: "Sì, sei coperto." } }));
    const v = coda.find((x) => x.messaggio.id === "m04")!;
    expect(v.avvisi.map((a) => a.tipo)).toContain("promesse");
    expect(v.bozzaModificata).toBe(true);
  });
});
