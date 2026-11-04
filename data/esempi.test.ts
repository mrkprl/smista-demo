import { describe, expect, it } from "vitest";
import { ANALISI_ESEMPI } from "./esempi";
import { MESSAGGI_DI_ESEMPIO } from "./messaggi";

describe("analisi salvate dei messaggi di esempio", () => {
  it("valgono lo schema e coprono tutti i 13 messaggi", () => {
    for (const m of MESSAGGI_DI_ESEMPIO) expect(ANALISI_ESEMPI.analisi[m.id]).toBeDefined();
  });
});
