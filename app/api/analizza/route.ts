import { analizza } from "@/lib/ai/analizza";
import { gestisciAnalisi } from "@/lib/api-analizza";
import { contatoriInMemoria, contatoriNeon, type Contatori } from "@/lib/limiti";

const produzione = process.env.NODE_ENV === "production";

// In sviluppo, senza DATABASE_URL, i contatori stanno in memoria. In produzione la route risponde 503.
let contatori: Contatori | null = null;
if (process.env.DATABASE_URL) contatori = contatoriNeon(process.env.DATABASE_URL);
else if (!produzione) contatori = contatoriInMemoria();

export async function POST(req: Request) {
  return gestisciAnalisi(req, {
    analizza: (testo) => analizza(testo),
    contatori,
    sale: process.env.SMISTA_SALE_IP ?? "",
    produzione,
    chiaveApi: Boolean(process.env.ANTHROPIC_API_KEY),
    ora: () => new Date(),
  });
}
