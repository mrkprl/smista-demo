"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, TriangleAlert } from "lucide-react";
import BadgeStato, { BadgeUrgenza } from "@/components/BadgeStato";
import { Badge } from "@/components/ui/badge";
import { EtichettaCategoria, IconaCategoria } from "@/components/Categoria";
import { costruisciCoda, gestita, type Voce } from "@/lib/demo/coda";
import { elementiCoda, ORIGINE_ANALISI } from "@/lib/demo/elementi";
import { azioni, useStatoDemo } from "@/lib/demo/stato";
import { ETICHETTA_CANALE, tempoFa } from "@/lib/etichette";
import { riepilogo, type AzioneOperatore } from "@/lib/regole";
import { cn } from "@/lib/utils";
import Dettaglio from "./Dettaglio";

// La selezione sta nell'hash (#m01): il tasto indietro del telefono torna alla coda.
function iscriviHash(a: () => void) {
  const ascolta = () => {
    if (!window.location.hash) selezioneDaNoi = false;
    a();
  };
  window.addEventListener("hashchange", ascolta);
  return () => window.removeEventListener("hashchange", ascolta);
}
function leggiHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
}
// true se la voce di storia del dettaglio l'abbiamo aggiunta noi: allora "indietro" la toglie.
let selezioneDaNoi = false;

function seleziona(id: string) {
  if (selezioneDaNoi && window.location.hash) {
    // Già in un dettaglio: si sostituisce, così "indietro" torna sempre alla coda.
    window.history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    selezioneDaNoi = true;
    window.location.hash = encodeURIComponent(id);
  }
  // Su telefono il dettaglio sostituisce la coda: si riparte dall'alto.
  if (window.matchMedia("(max-width: 1023px)").matches) window.scrollTo(0, 0);
}

function tornaAllaCoda() {
  if (selezioneDaNoi) {
    selezioneDaNoi = false;
    window.history.back();
  } else {
    window.history.replaceState(null, "", window.location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

// Lo smistamento mostra solo quello che aspetta l'operatore. Dopo l'invio un messaggio passa
// in "In attesa di risposta": la risposta è partita, ora tocca al cliente.
type Filtro = "dasmistare" | "perTe" | "telefonate" | "attesa" | "chiuse" | "scartati" | "tutti";
const FILTRI: { valore: Filtro; testo: string }[] = [
  { valore: "dasmistare", testo: "Da smistare" },
  { valore: "attesa", testo: "In attesa di risposta" },
  { valore: "chiuse", testo: "Chiuse" },
  { valore: "scartati", testo: "Scartati" },
  { valore: "tutti", testo: "Tutti" },
];
const FILTRO_INIZIALE: Filtro = "dasmistare";

function passaFiltro(v: Voce, f: Filtro): boolean {
  if (f === "dasmistare")
    return (
      v.stato === "da_vedere" ||
      v.stato === "da_rivedere" ||
      v.stato === "testo_fisso"
    );
  if (f === "perTe")
    return v.stato === "da_vedere" || v.stato === "da_rivedere";
  if (f === "telefonate") return v.stato === "testo_fisso";
  if (f === "attesa")
    return v.stato === "approvata" || v.stato === "automatica";
  if (f === "chiuse") return v.stato === "chiusa";
  if (f === "scartati") return v.stato === "scartata";
  return true;
}

type Fatto = {
  id: string;
  mittente: string;
  azione: "approvata" | "scartata" | "chiusa";
  /** Lo stato a cui riporta "Annulla". */
  prima: AzioneOperatore | null;
};

export default function AppCoda() {
  const stato = useStatoDemo();
  const hash = useSyncExternalStore(iscriviHash, leggiHash, () => "");
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_INIZIALE);
  const [fatto, setFatto] = useState<Fatto | null>(null);

  const voci = useMemo(
    () => costruisciCoda(elementiCoda(stato.provati), stato),
    [stato],
  );
  const r = riepilogo(voci.map((v) => v.stato));
  const visibili = voci.filter((v) => passaFiltro(v, filtro));
  const selezionata = voci.find((v) => v.messaggio.id === hash) ?? null;
  const mostrata = selezionata ?? visibili[0] ?? null;
  const inAttesa = voci.filter((v) => passaFiltro(v, "attesa")).length;

  /** Dopo Approva o Scarta il messaggio esce dallo smistamento: si passa al successivo. */
  function dopoAzione(voce: Voce, azione: "approvata" | "scartata" | "chiusa") {
    setFatto({
      id: voce.messaggio.id,
      mittente: voce.messaggio.mittente,
      azione,
      prima: azione === "chiusa" && voce.stato === "approvata" ? "approvata" : null,
    });
    if (!passaFiltro({ ...voce, stato: azione }, filtro)) {
      const i = visibili.findIndex((v) => v.messaggio.id === voce.messaggio.id);
      const prossimo = visibili[i + 1] ?? visibili[i - 1];
      if (window.matchMedia("(max-width: 1023px)").matches || !prossimo) {
        tornaAllaCoda();
        // Su telefono si torna in cima alla coda, dove c'è la conferma con "Annulla".
        setTimeout(() => window.scrollTo(0, 0), 50);
      } else seleziona(prossimo.messaggio.id);
    }
  }

  // I tre riquadri sono anche filtri: un clic mostra solo quei messaggi, un secondo clic torna a tutti.
  const numeri: { n: number; testo: string; classi: string; filtro: Filtro }[] =
    [
      {
        n: r.aspettano,
        testo: "aspettano te",
        classi: "text-primary",
        filtro: "perTe",
      },
      {
        n: r.telefonate,
        testo: "da chiamare",
        classi: "text-blu",
        filtro: "telefonate",
      },
      {
        n: inAttesa,
        testo: "in attesa",
        classi: "text-oliva",
        filtro: "attesa",
      },
    ];

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 items-start gap-6 px-4 py-6 sm:px-6 xl:gap-5 xl:py-5 lg:grid-cols-[minmax(320px,5fr)_7fr] xl:max-w-[88rem] xl:grid-cols-[410px_1fr] 2xl:grid-cols-[440px_1fr]">
      <section
        aria-label="Coda dei messaggi"
        className={cn(
          "rounded-[20px] bg-muted p-3 sm:p-4 lg:block",
          selezionata ? "hidden" : "block",
        )}
      >
        {ORIGINE_ANALISI === "scritte_a_mano" && (
          <p className="mb-4 rounded-2xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
            Anteprima: le analisi di questi esempi sono scritte a mano, in
            attesa di quelle generate dall&apos;AI.
          </p>
        )}

        <div className="ombra-scheda rounded-[20px] bg-card p-4">
          <h2 className="text-2xl font-bold tracking-tight">
            {r.totale} messaggi dei clienti
          </h2>
          <div
            role="group"
            aria-label="Mostra solo"
            className="mt-3 grid grid-cols-3 gap-2"
          >
            {numeri.map((x) => {
              const attivo = filtro === x.filtro;
              return (
                <button
                  key={x.filtro}
                  type="button"
                  aria-pressed={attivo}
                  onClick={() => setFiltro(attivo ? FILTRO_INIZIALE : x.filtro)}
                  className={cn(
                    "cursor-pointer rounded-[15px] border-2 px-1 py-2 text-center transition-colors sm:px-2",
                    attivo
                      ? "border-primary bg-accent"
                      : "border-transparent bg-muted hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "block text-2xl leading-none font-bold",
                      x.classi,
                    )}
                  >
                    {x.n}
                  </span>
                  <span className="mt-1 block truncate text-[13px] leading-tight whitespace-nowrap text-muted-foreground">
                    {x.testo}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="group"
          aria-label="Filtra la coda"
          className="mt-4 flex flex-wrap gap-2"
        >
          {FILTRI.map((f) => (
            <button
              key={f.valore}
              type="button"
              aria-pressed={filtro === f.valore}
              onClick={() => setFiltro(f.valore)}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                filtro === f.valore
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
              )}
            >
              {f.testo}
            </button>
          ))}
        </div>

        {fatto && (
          <p
            role="status"
            className="ombra-scheda mt-4 flex items-start gap-2 rounded-[15px] bg-card px-4 py-2.5 text-[15px]"
          >
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-oliva" strokeWidth={3} />
            <span className="min-w-0 flex-1 leading-snug">
              <span className="font-semibold">{fatto.mittente}</span>
              {fatto.azione === "approvata"
                ? " è passato in “In attesa di risposta”."
                : fatto.azione === "chiusa"
                  ? ": pratica chiusa."
                  : " è stato scartato."}
            </span>
            <button
              type="button"
              onClick={() => {
                azioni.impostaAzione(fatto.id, fatto.prima);
                setFatto(null);
                seleziona(fatto.id);
              }}
              className="shrink-0 cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
            >
              Annulla
            </button>
          </p>
        )}

        <ol className="mt-4 space-y-2.5">
          {visibili.map((v) => (
            <li key={v.messaggio.id}>
              <RigaCoda
                voce={v}
                attiva={mostrata?.messaggio.id === v.messaggio.id}
              />
            </li>
          ))}
          {visibili.length === 0 && (
            <li className="rounded-[20px] bg-card px-5 py-8 text-center text-sm text-muted-foreground">
              Nessun messaggio qui.
            </li>
          )}
        </ol>
      </section>

      <section
        aria-label="Dettaglio del messaggio"
        className={cn(
          // Su computer il dettaglio resta in vista e scorre per conto suo.
          "lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[20px]",
          selezionata ? "block" : "hidden",
        )}
      >
        {mostrata ? (
          <Dettaglio
            key={mostrata.messaggio.id}
            voce={mostrata}
            onIndietro={tornaAllaCoda}
            onFatto={dopoAzione}
          />
        ) : (
          <p className="rounded-[20px] bg-card p-6 text-muted-foreground">
            Nessun messaggio.
          </p>
        )}
      </section>
    </main>
  );
}

function RigaCoda({ voce, attiva }: { voce: Voce; attiva: boolean }) {
  const { messaggio: m, analisi: a, stato } = voce;
  const pericolo = stato === "testo_fisso";
  return (
    <button
      type="button"
      onClick={() => seleziona(m.id)}
      data-id={m.id}
      aria-current={attiva ? "true" : undefined}
      className={cn(
        "ombra-scheda flex w-full cursor-pointer gap-3 rounded-[20px] border-[3px] bg-card p-4 text-left transition-colors",
        // Selezionata: bordo pieno e sfondo grigio chiaro. Pericolo: bordo rosso.
        attiva
          ? "lg:border-primary lg:bg-accent"
          : "border-transparent hover:border-primary/40",
        pericolo && !attiva && "border-pericolo/45",
        pericolo && attiva && "border-pericolo",
      )}
    >
      {a && (
        <IconaCategoria
          categoria={a.categoria}
          className={cn(pericolo && "bg-pericolo text-primary-foreground")}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-bold">{m.mittente}</span>
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {ETICHETTA_CANALE[m.canale]} · {tempoFa(m.ricevutoDaMinuti)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed">
          <span className="barra" data-barrata={gestita(stato)}>
            {m.testo}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {pericolo && (
            <Badge className="h-6 bg-pericolo px-2.5 text-[13px] font-bold text-primary-foreground">
              <TriangleAlert aria-hidden strokeWidth={2.5} />
              Pericolo
            </Badge>
          )}
          {a && <EtichettaCategoria categoria={a.categoria} />}
          {a && <BadgeUrgenza urgenza={a.urgenza} />}
          <BadgeStato stato={stato} className="ml-auto" />
        </div>
      </div>
    </button>
  );
}
