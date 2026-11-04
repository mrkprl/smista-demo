import { Flame, KeyRound, MapPin, PanelTop, Phone, TriangleAlert, UserCheck, UserX, Wifi, Wrench, Zap, type LucideIcon } from "lucide-react";
import { ETICHETTA_TECNICO } from "@/lib/etichette";
import { linkTelefono, type Abbinamento, type Suggerimento } from "@/lib/gestionale";
import type { TipoIntervento } from "@/lib/tipi";
import { cn } from "@/lib/utils";

const ICONA_TECNICO: Record<Exclude<TipoIntervento, "nessuno">, LucideIcon> = {
  idraulico: Wrench,
  elettricista: Zap,
  fabbro_falegname: KeyRound,
  vetraio_serrandista: PanelTop,
  tecnico_gas_clima: Flame,
  ripristino_rete: Wifi,
};

const km = (n: number) => `${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;

/** Cliente in gestionale e, se serve, il tecnico da mandare: un solo blocco compatto. */
export default function ClienteEIntervento({
  abbinamento,
  suggerimento: s,
}: {
  abbinamento: Abbinamento | null;
  suggerimento: Suggerimento | null;
}) {
  const c = abbinamento?.cliente;
  return (
    <div
      className={cn(
        "space-y-2.5 rounded-[15px] p-3 text-[15px]",
        c ? "bg-oliva-chiaro" : "border border-scadenza/30 bg-[#fdf0ef]",
      )}
    >
      {c ? (
        <div className="flex gap-2.5">
          <UserCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-oliva-scuro" />
          <p className="min-w-0 leading-snug">
            <span className="font-bold">{c.nome}</span> · polizza {c.polizza}
            <br />
            {c.indirizzo}, {c.citta}
            <span className="text-[13px] text-oliva-scuro"> · riconosciuto dal {abbinamento.come}</span>
          </p>
        </div>
      ) : (
        <div role="alert" className="flex gap-2.5 text-scadenza">
          <UserX aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p className="leading-snug">
            <span className="font-bold">Cliente non trovato nel gestionale.</span>
            <br />
            <span className="text-[13px]">Verifica nome e numero di polizza prima di aprire pratiche o mandare tecnici.</span>
          </p>
        </div>
      )}

      {s && <Tecnico s={s} />}
    </div>
  );
}

function Tecnico({ s }: { s: Suggerimento }) {
  const Icona = ICONA_TECNICO[s.tipo];
  const [primo, ...altri] = s.convenzionati;
  return (
    <div className="rounded-xl border-2 border-oliva bg-card px-3 py-2.5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-oliva-scuro">
        <Icona aria-hidden className="size-4" strokeWidth={2.4} />
        {ETICHETTA_TECNICO[s.tipo]}
        {primo && " · convenzionato più vicino"}
      </p>

      {primo && s.posizione ? (
        <>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-bold">{primo.nome}</span>
            <span className="flex items-center gap-1">
              <MapPin aria-hidden className="size-4 text-oliva" />
              {primo.zona} · {km(primo.km)}
            </span>
            <a
              href={linkTelefono(primo.telefono)}
              className="flex items-center gap-1.5 rounded-full bg-oliva px-3 py-1 text-[13px] font-semibold text-white transition-colors hover:bg-oliva-scuro"
            >
              <Phone aria-hidden className="size-3.5" />
              Chiama {primo.telefono}
            </a>
          </p>
          {altri.length > 0 && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              Altri: {altri.map((x) => `${x.nome} (${km(x.km)}, ${x.telefono})`).join(" · ")}
            </p>
          )}
          {s.posizione.fonte === "città" && (
            <p className="mt-1 text-[13px] text-accent-foreground">
              So solo la città ({s.posizione.descrizione}): chiedi l&apos;indirizzo esatto.
            </p>
          )}
        </>
      ) : (
        <p className="mt-1">
          {s.posizione
            ? `Nessun convenzionato entro 50 km da ${s.posizione.descrizione}.`
            : "Non so dov'è l'immobile: chiedi l'indirizzo per scegliere il convenzionato."}
        </p>
      )}

      {s.indirizzoDiverso && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-accent-foreground">
          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          L&apos;indirizzo nel messaggio è diverso da quello in polizza: verifica dove mandare il tecnico.
        </p>
      )}
    </div>
  );
}
