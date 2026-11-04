// Logica della route POST /api/analizza, separata dal file della route per poterla testare.
import { ErroreAnalisi, type CodiceErrore } from "./ai/analizza";
import { controllaLimiti, ipDalleIntestazioni, LIMITE_PER_IP, LIMITE_TOTALE, type Contatori } from "./limiti";
import type { Analisi } from "./tipi";

export const MAX_CARATTERI = 1500;
const MAX_BYTE_CORPO = 10_000;

export type Dipendenze = {
  analizza: (testo: string) => Promise<Analisi>;
  /** null se manca DATABASE_URL. */
  contatori: Contatori | null;
  sale: string;
  produzione: boolean;
  chiaveApi: boolean;
  ora: () => Date;
};

const STATO_ERRORE_AI: Record<CodiceErrore, number> = {
  rifiuto: 422,
  non_valida: 422,
  troncata: 422,
  servizio: 502,
};

function errore(status: number, messaggio: string) {
  return Response.json({ errore: messaggio }, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Solo la pagina della demo può chiamare l'API: un altro sito non può consumare
 * la quota dei visitatori. Le richieste senza Origin (curl, script) restano soggette ai limiti.
 */
function daAltroSito(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = primoValore(req.headers.get("x-forwarded-host")) ?? primoValore(req.headers.get("host"));
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

function primoValore(v: string | null): string | null {
  return v?.split(",")[0]?.trim() || null;
}

const NON_DISPONIBILE = "L'analisi dal vivo non è disponibile in questo momento.";

export async function gestisciAnalisi(req: Request, d: Dipendenze): Promise<Response> {
  if (daAltroSito(req)) return errore(403, "Richiesta non consentita.");
  if (!d.chiaveApi) return errore(503, NON_DISPONIBILE);
  if (d.produzione && (!d.contatori || !d.sale)) return errore(503, NON_DISPONIBILE);
  if (!d.contatori) return errore(503, NON_DISPONIBILE);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTE_CORPO) {
    return errore(413, "Richiesta troppo grande.");
  }
  const grezzo = await req.text();
  if (grezzo.length > MAX_BYTE_CORPO) return errore(413, "Richiesta troppo grande.");

  let corpo: unknown;
  try {
    corpo = JSON.parse(grezzo);
  } catch {
    return errore(400, "Richiesta non valida.");
  }
  const testo =
    corpo && typeof corpo === "object" && typeof (corpo as { testo?: unknown }).testo === "string"
      ? (corpo as { testo: string }).testo.trim()
      : null;
  if (testo === null) return errore(400, "Richiesta non valida.");
  if (testo.length === 0) return errore(400, "Scrivi un messaggio da analizzare.");
  if (testo.length > MAX_CARATTERI) {
    return errore(400, `Il messaggio supera i ${MAX_CARATTERI.toLocaleString("it-IT")} caratteri.`);
  }

  let limiti;
  try {
    limiti = await controllaLimiti(d.contatori, ipDalleIntestazioni(req.headers), d.sale || "sviluppo", d.ora());
  } catch {
    return errore(503, NON_DISPONIBILE);
  }
  if (!limiti.ok) {
    return errore(
      429,
      limiti.motivo === "ip"
        ? `Hai già fatto ${LIMITE_PER_IP} analisi oggi, il massimo per questa demo. Riprova domani.`
        : `La demo ha raggiunto il limite di ${LIMITE_TOTALE} analisi per oggi. Riprova domani.`,
    );
  }

  try {
    const analisi = await d.analizza(testo);
    return Response.json({ analisi }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof ErroreAnalisi) {
      console.error(`[analizza] errore AI: ${e.codice}`);
      return errore(STATO_ERRORE_AI[e.codice], e.message);
    }
    console.error("[analizza] errore imprevisto");
    return errore(500, "Si è verificato un errore. Riprova tra poco.");
  }
}
