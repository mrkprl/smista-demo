import { describe, expect, it } from "vitest";
import { controllaLimiti, contatoriInMemoria, giornoRoma, hashIp, ipDalleIntestazioni, LIMITE_PER_IP, LIMITE_TOTALE } from "./limiti";

const ORA = new Date("2026-10-19T10:00:00Z");

describe("giornoRoma", () => {
  it("usa il fuso di Roma", () => {
    expect(giornoRoma(new Date("2026-10-19T21:59:00Z"))).toBe("2026-10-19");
    expect(giornoRoma(new Date("2026-10-19T22:01:00Z"))).toBe("2026-10-20"); // mezzanotte a Roma (ora legale)
  });
});

describe("hashIp", () => {
  it("non contiene l'IP e cambia con il giorno e con il sale", () => {
    const h = hashIp("203.0.113.7", "sale", "2026-10-19");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("203.0.113.7");
    expect(hashIp("203.0.113.7", "sale", "2026-10-20")).not.toBe(h);
    expect(hashIp("203.0.113.7", "altro", "2026-10-19")).not.toBe(h);
  });
});

describe("ipDalleIntestazioni", () => {
  it("preferisce le intestazioni scritte da Vercel a x-forwarded-for, che il client può falsificare", () => {
    const h = new Headers({
      "x-forwarded-for": "1.1.1.1, 203.0.113.7",
      "x-vercel-forwarded-for": "203.0.113.7",
      "x-real-ip": "198.51.100.2",
    });
    expect(ipDalleIntestazioni(h)).toBe("203.0.113.7");
    expect(ipDalleIntestazioni(new Headers({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
  });

  it("prende il primo valore di x-forwarded-for", () => {
    expect(ipDalleIntestazioni(new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("ripiega su x-real-ip e poi su un valore fisso", () => {
    expect(ipDalleIntestazioni(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(ipDalleIntestazioni(new Headers())).toBe("sconosciuto");
  });
});

describe("controllaLimiti", () => {
  it(`blocca il tentativo numero ${LIMITE_PER_IP + 1} dallo stesso IP`, async () => {
    const c = contatoriInMemoria();
    for (let i = 0; i < LIMITE_PER_IP; i++) {
      expect(await controllaLimiti(c, "1.1.1.1", "sale", ORA)).toEqual({ ok: true });
    }
    expect(await controllaLimiti(c, "1.1.1.1", "sale", ORA)).toEqual({ ok: false, motivo: "ip" });
    expect(await controllaLimiti(c, "2.2.2.2", "sale", ORA)).toEqual({ ok: true });
  });

  it(`blocca il tentativo numero ${LIMITE_TOTALE + 1} della giornata`, async () => {
    const c = contatoriInMemoria();
    for (let i = 0; i < LIMITE_TOTALE; i++) {
      expect((await controllaLimiti(c, `10.0.${Math.floor(i / 5)}.${i % 5}`, "s", ORA)).ok).toBe(true);
    }
    expect(await controllaLimiti(c, "9.9.9.9", "s", ORA)).toEqual({ ok: false, motivo: "totale" });
  });

  it("riparte il giorno dopo", async () => {
    const c = contatoriInMemoria();
    for (let i = 0; i < LIMITE_PER_IP; i++) await controllaLimiti(c, "1.1.1.1", "s", ORA);
    const domani = new Date(ORA.getTime() + 24 * 3600_000);
    expect(await controllaLimiti(c, "1.1.1.1", "s", domani)).toEqual({ ok: true });
  });

  it("un IP bloccato non consuma il limite totale", async () => {
    const c = contatoriInMemoria();
    for (let i = 0; i < 20; i++) await controllaLimiti(c, "1.1.1.1", "s", ORA);
    expect(c.leggi(giornoRoma(ORA), "__totale__")).toBe(LIMITE_PER_IP);
  });
});
