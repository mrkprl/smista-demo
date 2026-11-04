"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { azioni } from "@/lib/demo/stato";
import { Loader2, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SchemaAnalisi } from "@/lib/tipi";

const MAX = 1500;

export default function ProvaTu() {
  const router = useRouter();
  const [testo, setTesto] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    const pulito = testo.trim();
    if (!pulito || inCorso) return;
    setInCorso(true);
    setErrore(null);
    try {
      const r = await fetch("/api/analizza", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ testo: pulito }),
      });
      const corpo: unknown = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = (corpo as { errore?: unknown } | null)?.errore;
        setErrore(typeof msg === "string" ? msg : "Si è verificato un errore. Riprova tra poco.");
        return;
      }
      const analisi = SchemaAnalisi.safeParse((corpo as { analisi?: unknown } | null)?.analisi);
      if (!analisi.success) {
        setErrore("Risposta del server non valida.");
        return;
      }
      const id = `p${Date.now().toString(36)}`;
      azioni.aggiungiProvato({
        messaggio: { id, canale: "prova", mittente: "Il tuo messaggio", testo: pulito, ricevutoDaMinuti: 0 },
        analisi: analisi.data,
      });
      setTesto("");
      router.push(`/#${id}`);
    } catch {
      setErrore("Connessione non riuscita. Riprova.");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <form onSubmit={invia} className="mt-6 ombra-scheda rounded-[20px] border bg-card p-5 sm:p-7">
      <Label htmlFor="testo" className="text-base font-bold">
        Il messaggio del cliente
      </Label>
      <p id="avviso" className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-accent-foreground">
        <ShieldAlert aria-hidden className="size-4" />
        Non inserire dati personali veri.
      </p>
      <Textarea
        id="testo"
        aria-describedby="avviso conta"
        value={testo}
        onChange={(e) => setTesto(e.target.value.slice(0, MAX))}
        maxLength={MAX}
        rows={7}
        placeholder="Es. «Buongiorno, è entrata acqua dal tetto durante il temporale, cosa devo fare?»"
        className="mt-4 min-h-44 rounded-[15px] p-4 text-[15px] leading-relaxed md:text-[15px]"
      />
      <div className="mt-2 flex justify-between gap-4 text-[13px] text-muted-foreground">
        <span id="conta" aria-live="polite">
          {testo.length.toLocaleString("it-IT")} / {MAX.toLocaleString("it-IT")}
        </span>
        <span>5 analisi al giorno per persona</span>
      </div>
      <Button type="submit" size="lg" disabled={inCorso || testo.trim().length === 0} className="mt-5 w-full sm:w-auto">
        {inCorso ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
        {inCorso ? "Analisi in corso…" : "Analizza e metti in coda"}
      </Button>
      {errore && (
        <p role="alert" className="mt-4 rounded-[15px] bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
          {errore}
        </p>
      )}
    </form>
  );
}
