import type { Metadata } from "next";
import { Bot, Check, Cog, Inbox, Send, UserRound, type LucideIcon } from "lucide-react";
import { ANALISI_ESEMPI, VALUTAZIONE } from "@/data/esempi";
import { MESSAGGI_DI_ESEMPIO } from "@/data/messaggi";
import { ETICHETTA_CATEGORIA, ETICHETTA_ESITO, ETICHETTA_LIVELLO, ETICHETTA_TECNICO } from "@/lib/etichette";
import { suggerisciIntervento } from "@/lib/gestionale";
import { decidiEsito, trovaPromesse } from "@/lib/regole";
import { IMPOSTAZIONI_INIZIALI, LIVELLI } from "@/lib/tipi";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Come funziona" };

type Chi = "AI" | "Codice" | "Persona" | "Cliente";

const COLORE: Record<Chi, { cerchio: string; etichetta: string; Icona: LucideIcon }> = {
  Cliente: { cerchio: "bg-foreground text-background", etichetta: "bg-muted text-foreground", Icona: Inbox },
  AI: { cerchio: "bg-blu text-white", etichetta: "bg-blu-chiaro text-blu-scuro", Icona: Bot },
  Codice: { cerchio: "bg-viola text-white", etichetta: "bg-viola-chiaro text-viola-scuro", Icona: Cog },
  Persona: { cerchio: "bg-oliva text-white", etichetta: "bg-oliva-chiaro text-oliva-scuro", Icona: UserRound },
};

// L'esempio che si segue lungo il percorso: dati veri della demo, calcolati come nella coda.
const ESEMPIO = MESSAGGI_DI_ESEMPIO.find((m) => m.id === "m02")!;
const ANALISI = ANALISI_ESEMPI.analisi[ESEMPIO.id];
const DECISIONE = ANALISI ? decidiEsito(ANALISI, IMPOSTAZIONI_INIZIALI) : null;
const INTERVENTO = ANALISI ? suggerisciIntervento(ESEMPIO, ANALISI) : null;

function data(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "Europe/Rome" }).format(new Date(iso));
}

/** Il messaggio descritto a parole, senza citarne il testo (che può contenere istruzioni rivolte all'AI). */
function descriviMessaggio(m: (typeof MESSAGGI_DI_ESEMPIO)[number] | undefined, id: string) {
  if (!m) return `nel messaggio ${id}`;
  if (m.attesi.regole.istruzioni_sospette) return "nel messaggio con istruzioni sospette";
  return `nel messaggio di ${m.mittente}`;
}

function km(n: number) {
  return `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

function Passo({
  chi,
  titolo,
  testo,
  cose,
  esempio,
  ultimo,
}: {
  chi: Chi;
  titolo: string;
  testo: string;
  cose: string[];
  esempio: React.ReactNode;
  ultimo?: boolean;
}) {
  const { cerchio, etichetta, Icona } = COLORE[chi];
  return (
    <li className="relative grid grid-cols-[2.75rem_1fr] gap-x-4 pb-10 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
      {!ultimo && <span aria-hidden className="absolute top-12 bottom-0 left-[1.3rem] w-1 rounded-full bg-muted sm:left-[1.4rem]" />}
      <span aria-hidden className={cn("relative z-10 flex size-11 items-center justify-center rounded-full sm:size-12", cerchio)}>
        <Icona className="size-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 pt-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{titolo}</h2>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[13px] font-semibold", etichetta)}>{chi}</span>
        </div>
        <p className="mt-2 max-w-[60ch] text-[17px] leading-relaxed">{testo}</p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {cose.map((c) => (
            <li key={c} className="flex items-start gap-2 text-[15px]">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-oliva" strokeWidth={3} />
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-[15px] bg-muted p-4 text-[15px] leading-relaxed">
          <p className="mb-1.5 text-[13px] font-semibold text-muted-foreground">Nell&apos;esempio</p>
          {esempio}
        </div>
      </div>
    </li>
  );
}

export default function Pagina() {
  const v = VALUTAZIONE;
  const a = ANALISI;
  const primo = INTERVENTO?.convenzionati[0];
  const numeri = v
    ? [
        ["Categoria", v.categorie],
        ["Urgenza", v.urgenze],
        ...(v.tecnici ? [["Tecnico", v.tecnici] as const] : []),
        ["Livello di risposta", v.livelli],
      ]
    : [];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-5xl">Come funziona</h1>
      <p className="mt-4 max-w-[60ch] text-lg leading-relaxed sm:text-xl">
        Dal messaggio del cliente alla risposta, in quattro passaggi. Seguiamo un messaggio vero della demo: una cliente
        rimasta chiusa fuori casa.
      </p>

      <ol className="mt-10">
        <Passo
          chi="Cliente"
          titolo="Arriva il messaggio"
          testo="Per email o WhatsApp, scritto come capita: senza polizza, con errori, a volte in inglese."
          cose={["Entra nella coda", "Nessun modulo da compilare per il cliente"]}
          esempio={
            <p className="rounded-[15px] rounded-tl-sm bg-card p-3">
              {ESEMPIO.testo}
              <span className="mt-1 block text-[13px] text-muted-foreground">WhatsApp · {ESEMPIO.mittente}</span>
            </p>
          }
        />
        <Passo
          chi="AI"
          titolo="L'AI lo legge"
          testo="Capisce cosa chiede il cliente, anche se lo dice male, e prepara il lavoro per l'operatore."
          cose={[
            "Tipo di richiesta e urgenza",
            "Dati utili e dati che mancano",
            "Che tecnico serve",
            "Una bozza di risposta",
          ]}
          esempio={
            a ? (
              <p>
                {ETICHETTA_CATEGORIA[a.categoria]} · urgenza {a.urgenza} · {ETICHETTA_TECNICO[a.tipo_intervento].toLowerCase()}
                {a.dati_estratti.indirizzo && (
                  <>
                    <br />
                    Indirizzo trovato: {a.dati_estratti.indirizzo}
                  </>
                )}
              </p>
            ) : (
              <p>Analisi non disponibile.</p>
            )
          }
        />
        <Passo
          chi="Codice"
          titolo="Il codice controlla"
          testo="Regole fisse, uguali per tutti: quello che non si può sbagliare non lo decide l'AI."
          cose={[
            "Gas, fumo, incendio: testo fisso e telefonata",
            "Reclami: il conto dei 45 giorni",
            "Nessuna promessa di copertura nella bozza",
            "Cliente nel gestionale e convenzionato più vicino",
            "Ordine della coda per urgenza",
            "Se la risposta può partire da sola",
          ]}
          esempio={
            a ? (
              <p>
                {INTERVENTO?.cliente
                  ? `Cliente trovato: ${INTERVENTO.cliente.cliente.nome}, dal ${INTERVENTO.cliente.come}.`
                  : "Cliente non trovato nel gestionale."}
                {primo && (
                  <>
                    <br />
                    Convenzionato più vicino: {primo.nome}, a {km(primo.km)}.
                  </>
                )}
                <br />
                {trovaPromesse(a.bozza_risposta).length === 0 ? "Nessuna promessa nella bozza." : "La bozza contiene una promessa: segnalata."}{" "}
                {DECISIONE && `Risposta: ${ETICHETTA_ESITO[DECISIONE.esito].toLowerCase()}.`}
              </p>
            ) : (
              <p>Analisi non disponibile.</p>
            )
          }
        />
        <Passo
          chi="Persona"
          titolo="L'operatore decide"
          testo="Vede il messaggio già ordinato e preparato. Controlla, corregge se serve e approva."
          cose={["Approva, modifica o scarta la bozza", "Corregge categoria e urgenza", "Chiama il cliente nei casi di pericolo"]}
          esempio={<p>Approva la risposta e chiama {primo ? primo.nome : "il tecnico"}. Invio simulato: nella demo non parte nulla.</p>}
          ultimo
        />
      </ol>

      <section className="rounded-[20px] bg-muted p-5 sm:p-7">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Send aria-hidden className="size-6 text-primary" />
          Quando la risposta parte da sola
        </h2>
        <p className="mt-2 max-w-[60ch] text-[17px] leading-relaxed">
          Solo per le richieste semplici, e solo se la confidenza è alta, l&apos;urgenza non è alta e non c&apos;è nessun
          avviso. Il livello di ogni categoria lo sceglie l&apos;operatore nelle Impostazioni.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {LIVELLI.map((l) => (
            <div key={l} className="rounded-[15px] bg-card p-4">
              <p className="font-bold">{ETICHETTA_LIVELLO[l]}</p>
              <p className="mt-1 text-[15px] leading-relaxed">
                {Object.entries(IMPOSTAZIONI_INIZIALI)
                  .filter(([, liv]) => liv === l)
                  .map(([c]) => ETICHETTA_CATEGORIA[c as keyof typeof ETICHETTA_CATEGORIA])
                  .join(", ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Quanto sbaglia l&apos;AI</h2>
        {v ? (
          <>
            <p className="mt-2 max-w-[60ch] text-[17px] leading-relaxed">
              Ogni messaggio di esempio analizzato {v.ripetizioni} volte e confrontato con la risposta giusta: {v.prove}{" "}
              prove con {v.modello}, il {data(v.eseguitaIl)}.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {numeri.map(([nome, c]) => {
                const n = c as { giuste: number; totali: number };
                return (
                  <div key={nome as string} className="rounded-[15px] bg-muted p-4">
                    <p className="text-[15px]">{nome as string}</p>
                    <p className={cn("mt-1 text-3xl font-bold tabular-nums", n.giuste === n.totali ? "text-oliva-scuro" : "text-accent-foreground")}>
                      {n.giuste}/{n.totali}
                    </p>
                  </div>
                );
              })}
            </div>
            {v.errori.length > 0 ? (
              <ul className="mt-4 space-y-1.5 text-[15px]">
                {v.errori.map((e) => {
                  const m = MESSAGGI_DI_ESEMPIO.find((x) => x.id === e.id);
                  return (
                    <li key={`${e.id}-${e.campo}-${e.ottenuto}`}>
                      <span className="font-semibold">Dove sbaglia:</span> {descriviMessaggio(m, e.id)} dà {e.campo}{" "}
                      {e.ottenuto} invece di {e.atteso} ({e.volte} volte su {v.ripetizioni}).
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-[15px]">In queste prove non ha sbagliato. Su 13 messaggi non vuol dire che non sbagli mai.</p>
            )}
            <details className="mt-4 rounded-[15px] bg-muted">
              <summary className="cursor-pointer px-4 py-3 text-[15px] font-semibold">Tutte le regole controllate</summary>
              <ul className="space-y-1 px-4 pb-4 text-[15px]">
                {v.regole
                  .filter((r) => r.totali > 0)
                  .map((r) => (
                    <li key={r.nome} className="flex justify-between gap-4">
                      <span>{r.etichetta}</span>
                      <span className="font-bold tabular-nums">
                        {r.giuste}/{r.totali}
                      </span>
                    </li>
                  ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="mt-2 text-[17px]">Valutazione non ancora eseguita.</p>
        )}
      </section>

      <section className="mt-14 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cosa non fa</h2>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
            <li>Non decide se un danno è coperto né quanto si rimborsa: lo fa chi gestisce i sinistri.</li>
            <li>Non invia nulla: “Approva” e le risposte automatiche cambiano solo lo stato nella pagina.</li>
            <li>
              Non conserva i messaggi. Di “Prova tu” si salvano solo i contatori del limite giornaliero, con l&apos;IP
              trasformato in un codice non reversibile.
            </li>
            <li>Non usa cookie di profilazione. Conta le visite in forma anonima con Vercel Web Analytics.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dati e AI</h2>
          <p className="mt-3 text-[15px] leading-relaxed">
            I 13 esempi sono inventati e analizzati una volta sola
            {ANALISI_ESEMPI.origine === "ai" ? ` (${data(ANALISI_ESEMPI.generatoIl)}, ${ANALISI_ESEMPI.modello})` : ""}: la
            pagina si apre subito e non costa nulla. Dal vivo lavora solo “Prova tu”. L&apos;AI è Claude, chiamata solo dal
            server; l&apos;API di Anthropic elabora i dati fuori dall&apos;Unione europea, per questo la demo usa solo dati
            inventati.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed">
            Tutte le chiamate all&apos;AI passano da un&apos;unica funzione: si può passare a un modello installato in
            azienda (per esempio FastwebMIIA o DeepSeek V4 Flash) cambiando un solo file, e rilanciare la valutazione per
            confrontarlo. <span className="font-semibold">Questa strada non è stata provata nella demo.</span>
          </p>
        </div>
      </section>
    </main>
  );
}
