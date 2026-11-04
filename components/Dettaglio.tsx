"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCheck,
  Clock,
  Info,
  MessageCircle,
  Phone,
  TriangleAlert,
} from "lucide-react";
import BadgeStato from "@/components/BadgeStato";
import { IconaCategoria } from "@/components/Categoria";
import ClienteEIntervento from "@/components/Intervento";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ORA_RIFERIMENTO, type Voce } from "@/lib/demo/coda";
import { azioni } from "@/lib/demo/stato";
import {
  daChiedere,
  suggerisciIntervento,
  telefonoCliente,
  trovaCliente,
  type TelefonoCliente,
} from "@/lib/gestionale";
import {
  ETICHETTA_CANALE,
  ETICHETTA_CATEGORIA,
  ETICHETTA_ESITO,
  tempoFa,
} from "@/lib/etichette";
import {
  azioneRiapri,
  GIORNI_RECLAMO,
  giorniAllaScadenzaReclamo,
  scadenzaInRosso,
  testoFissoPer,
} from "@/lib/regole";
import { CATEGORIE, URGENZE, type Analisi, type Esito } from "@/lib/tipi";
import { cn } from "@/lib/utils";

type Fatto = (voce: Voce, azione: "approvata" | "scartata" | "chiusa") => void;
type Props = { voce: Voce; onIndietro: () => void; onFatto: Fatto };

export default function Dettaglio({ voce, onIndietro, onFatto }: Props) {
  const { messaggio: m, analisi: a, originale, decisione, stato } = voce;
  const suggerimento = a ? suggerisciIntervento(m, a) : null;
  const cliente = a ? trovaCliente(m, a) : null;
  const telefono = telefonoCliente(m, cliente);

  const avvisi = voce.avvisi.filter((x) => x.tipo !== "pericolo_persone");

  return (
    <article className="ombra-scheda rounded-[20px] border bg-card p-5 sm:p-6 xl:[@media(max-height:800px)]:p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onIndietro}
        className="-ml-2 mb-3 lg:hidden"
      >
        <ArrowLeft aria-hidden />
        Torna alla coda
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {a && <IconaCategoria categoria={a.categoria} className="size-11" />}
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold tracking-tight break-words">
              {m.mittente}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {ETICHETTA_CANALE[m.canale]} · {tempoFa(m.ricevutoDaMinuti)}
              {decisione && (
                <>
                  {" · "}
                  <span className="font-semibold text-foreground">
                    Risposta: {ETICHETTA_ESITO[decisione.esito]}
                  </span>
                  {decisione.motivo && <> ({decisione.motivo})</>}
                </>
              )}
            </p>
          </div>
        </div>
        <BadgeStato stato={stato} />
      </header>

      {/* Con il pericolo il pulsante per chiamare sta nel riquadro rosso. */}
      {telefono && decisione?.esito !== "testo_fisso" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={telefono.chiama}>
              <Phone aria-hidden />
              Chiama il cliente
            </a>
          </Button>
          {telefono.whatsapp && (
            <Button asChild variant="outline" size="sm">
              <a
                href={telefono.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden />
                Scrivi su WhatsApp
              </a>
            </Button>
          )}
          <span className="self-center text-[13px] text-muted-foreground">
            {telefono.numero}
          </span>
        </div>
      )}
      {decisione && (stato === "approvata" || stato === "automatica" || stato === "chiusa") && (
        <BarraPratica voce={voce} esito={decisione.esito} onFatto={onFatto} />
      )}


      {a && decisione?.esito === "testo_fisso" && (
        <BloccoPericolo
          voce={voce}
          analisi={a}
          telefono={telefono}
          onFatto={onFatto}
        />
      )}

      {a?.categoria === "reclamo" && (
        <ScadenzaReclamo ricevutoIl={voce.ricevutoIl} />
      )}

      {avvisi.length > 0 && (
        <div className="mt-4 space-y-2">
          {avvisi.map((x) => (
            <Alert
              key={x.tipo}
              className="rounded-[15px] border-primary/30 bg-accent px-4 py-2.5 text-accent-foreground"
            >
              <TriangleAlert aria-hidden />
              <AlertDescription className="font-medium text-accent-foreground">
                {x.testo}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Su schermi larghi due colonne: a sinistra si verifica (messaggio e AI), a destra si agisce
          (cliente, tecnico, risposta). Così la scheda sta in uno schermo senza scendere. */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2 xl:gap-6 xl:[@media(max-height:800px)]:mt-3">
        <div className="min-w-0 space-y-5 xl:[@media(max-height:800px)]:space-y-3">
          <Sezione titolo="Messaggio del cliente">
            <p className="rounded-[15px] rounded-tl-sm bg-muted px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {m.testo}
            </p>
          </Sezione>
          {a && originale && (
            <SchedaAI voce={voce} analisi={a} originale={originale} />
          )}
        </div>
        <div className="min-w-0 space-y-5 xl:[@media(max-height:800px)]:space-y-3">
          {a && (
            <Sezione titolo={suggerimento ? "Cliente e intervento" : "Cliente"}>
              <ClienteEIntervento
                abbinamento={suggerimento ? suggerimento.cliente : cliente}
                suggerimento={suggerimento}
              />
            </Sezione>
          )}
          {a && originale ? (
            <Risposta
              key={decisione?.esito}
              voce={voce}
              analisi={a}
              originale={originale}
              onFatto={onFatto}
            />
          ) : (
            <p className="text-muted-foreground">
              Analisi non disponibile per questo messaggio.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function Sezione({
  titolo,
  children,
}: {
  titolo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold">{titolo}</h2>
      {children}
    </section>
  );
}

/** Dopo l'invio: la pratica aspetta il cliente e si chiude quando è risolta. */
function BarraPratica({ voce, esito, onFatto }: { voce: Voce; esito: Esito; onFatto: Fatto }) {
  const id = voce.messaggio.id;
  if (voce.stato === "chiusa") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[15px] bg-oliva-chiaro px-4 py-3 text-[15px]">
        <CheckCheck aria-hidden className="size-5 text-oliva-scuro" />
        <span className="flex-1 font-semibold text-oliva-scuro">Pratica chiusa.</span>
        <Button variant="outline" size="sm" onClick={() => azioni.impostaAzione(id, azioneRiapri(esito))}>
          Riapri
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[15px] bg-blu-chiaro px-4 py-3 text-[15px]">
      <Clock aria-hidden className="size-5 text-blu-scuro" />
      <span className="min-w-0 flex-1 basis-56 text-blu-scuro">
        <span className="font-semibold">In attesa di risposta del cliente.</span>{" "}
        {voce.stato === "automatica" ? "La risposta è partita in automatico." : "La risposta è partita (invio simulato)."}
      </span>
      <Button
        size="sm"
        onClick={() => {
          azioni.impostaAzione(id, "chiusa");
          onFatto(voce, "chiusa");
        }}
      >
        <CheckCheck aria-hidden />
        Chiudi pratica
      </Button>
    </div>
  );
}

function BloccoPericolo({
  voce,
  analisi,
  telefono,
  onFatto,
}: {
  voce: Voce;
  analisi: Analisi;
  telefono: TelefonoCliente | null;
  onFatto: Fatto;
}) {
  const { messaggio: m, stato } = voce;
  const chiamato = stato === "approvata" || stato === "chiusa";
  return (
    <div
      role="alert"
      className="mt-4 rounded-[20px] bg-pericolo px-5 py-4 text-primary-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-lg font-bold">
          <Phone aria-hidden className="size-5" />
          Chiama subito il cliente
        </p>
        {/* L'azione sta qui, dove l'operatore guarda in quel momento. */}
        {chiamato || stato === "scartata" ? (
          <p className="flex items-center gap-2 text-sm font-semibold">
            {chiamato ? "Segnato come chiamato." : "Scartato."}
            <button
              type="button"
              onClick={() => azioni.impostaAzione(m.id, null)}
              className="cursor-pointer underline underline-offset-4"
            >
              Annulla
            </button>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {telefono && (
              <Button
                asChild
                variant="outline"
                className="border-transparent bg-card text-pericolo hover:bg-card/90 hover:text-pericolo"
              >
                <a href={telefono.chiama}>
                  <Phone aria-hidden />
                  Chiama ora
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                azioni.impostaAzione(m.id, "approvata");
                onFatto(voce, "approvata");
              }}
              className="border-transparent bg-card text-pericolo hover:bg-card/90 hover:text-pericolo"
            >
              <Check aria-hidden />
              Segna come chiamato
            </Button>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[15px] leading-relaxed">
        {testoFissoPer(m.testo, analisi.sottotipo)}
      </p>
      <p className="mt-1.5 text-[13px] opacity-90 xl:[@media(max-height:860px)]:hidden">
        Testo fisso scritto da una persona, inviato subito (invio simulato). La
        bozza dell&apos;AI resta sotto solo come riferimento.
      </p>
    </div>
  );
}

function ScadenzaReclamo({ ricevutoIl }: { ricevutoIl: string }) {
  const giorni = giorniAllaScadenzaReclamo(ricevutoIl, ORA_RIFERIMENTO);
  const rosso = scadenzaInRosso(giorni);
  const testo =
    giorni > 1
      ? `${giorni} giorni rimasti`
      : giorni === 1
        ? "1 giorno rimasto"
        : giorni === 0
          ? "Scade oggi"
          : "Scaduto";
  return (
    <div
      className={cn(
        "mt-4 flex gap-3 rounded-[15px] border px-4 py-3",
        rosso && "border-scadenza/30 bg-[#fdf0ef]",
      )}
    >
      <CalendarClock
        aria-hidden
        className={cn(
          "mt-1 size-6 shrink-0",
          rosso ? "text-scadenza" : "text-muted-foreground",
        )}
      />
      <div>
        <p className={cn("text-xl font-bold", rosso && "text-scadenza")}>
          {testo}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground xl:[@media(max-height:860px)]:hidden">
          Reclamo: risposta entro {GIORNI_RECLAMO} giorni dalla ricezione
          (Regolamento IVASS n. 24/2008). Calcolato dal codice, non
          dall&apos;AI.
        </p>
      </div>
    </div>
  );
}

function Correzione({ testo }: { testo: string }) {
  return (
    <p className="mt-1.5 text-[13px] font-medium text-accent-foreground">
      {testo}
    </p>
  );
}

function SchedaAI({
  voce,
  analisi: a,
  originale,
}: {
  voce: Voce;
  analisi: Analisi;
  originale: Analisi;
}) {
  const id = voce.messaggio.id;
  const d = a.dati_estratti;
  const mancanti = daChiedere(
    a.dati_mancanti,
    trovaCliente(voce.messaggio, a),
    voce.messaggio.canale,
  );
  // La descrizione ripete il messaggio: qui solo i dati che servono a lavorare.
  const dati = [
    ["Nome", d.nome],
    ["Polizza", d.numero_polizza],
    ["Indirizzo", d.indirizzo],
    ["Quando", d.data_evento],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <Sezione titolo="Cosa ha capito l'AI">
      <div className="space-y-2 rounded-[15px] border px-3.5 py-3 text-[15px]">
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <Select
              value={a.categoria}
              onValueChange={(v) =>
                azioni.correggi(
                  id,
                  "categoria",
                  v === originale.categoria
                    ? null
                    : (v as Analisi["categoria"]),
                )
              }
            >
              <SelectTrigger
                aria-label="Categoria"
                className="h-8 w-full rounded-xl bg-card px-3"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIE.map((c) => (
                  <SelectItem key={c} value={c}>
                    {ETICHETTA_CATEGORIA[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Select
              value={a.urgenza}
              onValueChange={(v) =>
                azioni.correggi(
                  id,
                  "urgenza",
                  v === originale.urgenza ? null : (v as Analisi["urgenza"]),
                )
              }
            >
              <SelectTrigger
                aria-label="Urgenza"
                className="h-8 w-full rounded-xl bg-card px-3"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENZE.map((u) => (
                  <SelectItem key={u} value={u}>
                    Urgenza {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {voce.correzione.categoria && (
          <Correzione
            testo={`Categoria corretta da te. L'AI aveva detto: ${ETICHETTA_CATEGORIA[originale.categoria]}`}
          />
        )}
        {voce.correzione.urgenza && (
          <Correzione
            testo={`Urgenza corretta da te. L'AI aveva detto: ${originale.urgenza}`}
          />
        )}
        <p className="text-sm leading-snug text-muted-foreground">
          {a.sottotipo && (
            <span className="font-medium text-foreground">{a.sottotipo}. </span>
          )}
          {a.motivo_urgenza}
        </p>

        {dati.length > 0 && (
          <p className="leading-snug">
            {dati.map(([k, v], i) => (
              <span key={k}>
                {i > 0 && " · "}
                <span className="text-muted-foreground">{k}: </span>
                {v}
              </span>
            ))}
          </p>
        )}

        {mancanti.daChiedere.length > 0 && (
          <p className="leading-snug">
            <span className="text-muted-foreground">Da chiedere: </span>
            {mancanti.daChiedere.join(", ")}
          </p>
        )}
        {mancanti.giaNoti.length > 0 && (
          <p className="text-[13px] leading-snug text-oliva-scuro">
            Già noti dal gestionale, non serve chiederli:{" "}
            {mancanti.giaNoti.join(", ")}
          </p>
        )}

        <p className="leading-snug">
          <span className="text-muted-foreground">Prossimo passo: </span>
          {a.prossimo_passo}{" "}
          <span
            className={cn(
              "text-[13px] text-muted-foreground",
              a.confidenza === "bassa" &&
                "font-semibold text-accent-foreground",
            )}
          >
            (confidenza {a.confidenza}, lingua {a.lingua})
          </span>
        </p>
      </div>
    </Sezione>
  );
}

function Risposta({
  voce,
  analisi: a,
  originale,
  onFatto,
}: {
  voce: Voce;
  analisi: Analisi;
  originale: Analisi;
  onFatto: Fatto;
}) {
  const id = voce.messaggio.id;
  const esito = voce.decisione?.esito;
  const { stato } = voce;
  // Con "solo persona" la risposta la scrive l'operatore: si parte da vuoto.
  const [testo, setTesto] = useState(() =>
    esito === "solo_persona"
      ? voce.bozzaModificata
        ? a.bozza_risposta
        : ""
      : a.bozza_risposta,
  );
  const chiusa = stato === "approvata" || stato === "scartata" || stato === "chiusa";

  if (stato === "automatica" || (stato === "chiusa" && esito === "automatico")) {
    return (
      <Sezione titolo="Risposta inviata in automatico">
        <p className="rounded-[15px] rounded-tr-sm bg-oliva-chiaro px-4 py-3 xl:max-h-80 xl:overflow-y-auto leading-relaxed whitespace-pre-wrap">
          {a.bozza_risposta}
        </p>
        <Nota>Invio simulato: nessun messaggio è partito davvero.</Nota>
      </Sezione>
    );
  }

  if (esito === "testo_fisso") {
    return <Riferimento bozza={originale.bozza_risposta} />;
  }

  const soloPersona = esito === "solo_persona";
  const nonPronta = a.confidenza === "bassa";

  return (
    <Sezione titolo={soloPersona ? "La tua risposta" : "Bozza di risposta"}>
      {soloPersona && (
        <Nota className="mt-0 mb-3 xl:[@media(max-height:860px)]:hidden">
          Qui la risposta la scrivi tu. La bozza dell&apos;AI è sotto, solo come
          riferimento.
        </Nota>
      )}
      {nonPronta && !soloPersona && (
        <p className="mb-3 text-sm font-semibold text-accent-foreground">
          Bozza non pronta: confidenza bassa, va rivista.
        </p>
      )}
      <label htmlFor={`bozza-${id}`} className="sr-only">
        Testo della risposta
      </label>
      <Textarea
        id={`bozza-${id}`}
        value={testo}
        disabled={chiusa}
        rows={6}
        maxLength={5000}
        onChange={(e) => {
          setTesto(e.target.value);
          azioni.impostaBozza(id, e.target.value);
        }}
        placeholder={soloPersona ? "Scrivi qui la risposta…" : undefined}
        className={cn(
          "min-h-32 rounded-[15px] bg-card px-4 py-3 text-[15px] leading-relaxed md:text-[15px] xl:min-h-0 xl:field-sizing-fixed",
          soloPersona ? "xl:h-28" : "xl:h-36",
        )}
      />
      {voce.bozzaModificata && !soloPersona && (
        <Correzione testo="Bozza modificata da te" />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {stato === "chiusa" ? null : chiusa ? (
          <Annulla
            id={id}
            testo={
              stato === "approvata"
                ? "Inviata (simulato)."
                : "Scartata."
            }
          />
        ) : (
          <>
            <Button
              disabled={testo.trim().length === 0}
              onClick={() => {
                azioni.impostaAzione(id, "approvata");
                onFatto(voce, "approvata");
              }}
            >
              Approva
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                azioni.impostaAzione(id, "scartata");
                onFatto(voce, "scartata");
              }}
            >
              Scarta
            </Button>
          </>
        )}
      </div>
      {soloPersona && <Riferimento bozza={originale.bozza_risposta} />}
    </Sezione>
  );
}

function Nota({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-2 flex items-start gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Annulla({ id, testo }: { id: string; testo: string }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold">{testo}</span>
      <Button
        variant="link"
        size="sm"
        className="px-0"
        onClick={() => azioni.impostaAzione(id, null)}
      >
        Annulla
      </Button>
    </p>
  );
}

function Riferimento({ bozza }: { bozza: string }) {
  return (
    <details className="mt-2 rounded-[15px] border">
      <summary className="cursor-pointer px-4 py-2 text-sm font-semibold">
        Bozza dell&apos;AI (solo riferimento)
      </summary>
      <p className="border-t px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {bozza}
      </p>
    </details>
  );
}
