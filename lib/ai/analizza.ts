// Unico punto del progetto che parla con un modello. Per cambiare modello si cambia solo questo file.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { CATEGORIE, CONFIDENZE, SchemaAnalisi, TIPI_INTERVENTO, URGENZE, type Analisi } from "@/lib/tipi";
import { ISTRUZIONI, messaggioUtente } from "./prompt";

export const MODELLO_PREDEFINITO = "claude-sonnet-5-5";
const MAX_TOKENS = 2000;
const MAX_TOKENS_RIPROVA = 4000;

export type CodiceErrore = "non_valida" | "rifiuto" | "troncata" | "servizio";

const MESSAGGI_ERRORE: Record<CodiceErrore, string> = {
  non_valida: "L'AI ha risposto in un formato non valido anche al secondo tentativo.",
  rifiuto: "L'AI si è rifiutata di analizzare questo messaggio.",
  troncata: "La risposta dell'AI era incompleta anche al secondo tentativo.",
  servizio: "Il servizio di analisi non è raggiungibile. Riprova tra poco.",
};

export class ErroreAnalisi extends Error {
  constructor(readonly codice: CodiceErrore) {
    super(MESSAGGI_ERRORE[codice]);
    this.name = "ErroreAnalisi";
  }
}

type Parametri = Anthropic.MessageCreateParamsNonStreaming;
type RispostaAI = Pick<Anthropic.Message, "stop_reason" | "content">;

/** Il minimo che serve del client: così nei test si passa un client finto. */
export type ClientAI = { messages: { create(params: Parametri): Promise<RispostaAI> } };

const ENUM: Record<string, readonly string[]> = {
  categoria: CATEGORIE,
  urgenza: URGENZE,
  confidenza: CONFIDENZE,
  tipo_intervento: TIPI_INTERVENTO,
};

/**
 * L'helper dell'SDK (0.135) sposta `enum` nella descrizione, ma l'API lo supporta:
 * lo rimettiamo come vincolo, così il modello non può inventare categorie.
 */
export function formatoAnalisi() {
  const formato = zodOutputFormat(SchemaAnalisi);
  const schema = structuredClone(formato.schema) as {
    properties: Record<string, { type?: string; enum?: readonly string[]; description?: string }>;
  };
  for (const [campo, valori] of Object.entries(ENUM)) {
    const { description, ...resto } = schema.properties[campo];
    const pulita = description?.replace(/\s*\{enum: [^}]*\}\s*$/, "").trim();
    schema.properties[campo] = { ...resto, type: "string", enum: [...valori], ...(pulita ? { description: pulita } : {}) };
  }
  return { ...formato, schema };
}

const FORMATO = formatoAnalisi();

/** Valida il JSON con Zod. Le maiuscole degli enum possono variare (lo dice la documentazione). */
function leggi(testo: string): Analisi | null {
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch {
    return null;
  }
  if (dati && typeof dati === "object") {
    const oggetto = dati as Record<string, unknown>;
    for (const campo of Object.keys(ENUM)) {
      const v = oggetto[campo];
      if (typeof v === "string") oggetto[campo] = v.trim().toLowerCase();
    }
  }
  const r = SchemaAnalisi.safeParse(dati);
  return r.success ? (r.data as z.infer<typeof SchemaAnalisi>) : null;
}

function clientPredefinito(): ClientAI {
  return new Anthropic({ timeout: 25_000, maxRetries: 1 });
}

export async function analizza(
  testo: string,
  opzioni: { client?: ClientAI; modello?: string } = {},
): Promise<Analisi> {
  const client = opzioni.client ?? clientPredefinito();
  const modello = opzioni.modello ?? (process.env.SMISTA_MODELLO || MODELLO_PREDEFINITO);

  let ultimoErrore: CodiceErrore = "non_valida";
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    let risposta: RispostaAI;
    try {
      risposta = await client.messages.create({
        model: modello,
        max_tokens: tentativo === 0 ? MAX_TOKENS : MAX_TOKENS_RIPROVA,
        system: ISTRUZIONI,
        messages: [{ role: "user", content: messaggioUtente(testo) }],
        output_config: { format: FORMATO },
      });
    } catch (e) {
      const status = e && typeof e === "object" && "status" in e ? String((e as { status: unknown }).status) : "rete";
      console.error(`[analizza] chiamata all'API fallita: ${status}`);
      throw new ErroreAnalisi("servizio");
    }

    if (risposta.stop_reason === "refusal") throw new ErroreAnalisi("rifiuto");
    if (risposta.stop_reason === "max_tokens") {
      ultimoErrore = "troncata";
      continue;
    }

    const blocco = risposta.content.find((b) => b.type === "text");
    const analisi = blocco && blocco.type === "text" ? leggi(blocco.text) : null;
    if (analisi) return analisi;
    ultimoErrore = "non_valida";
  }
  throw new ErroreAnalisi(ultimoErrore);
}
