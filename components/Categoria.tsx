import {
  Calculator,
  CreditCard,
  FilePen,
  FileX,
  House,
  MessageCircle,
  MessageSquareWarning,
  ShieldQuestion,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ETICHETTA_CATEGORIA } from "@/lib/etichette";
import type { Categoria } from "@/lib/tipi";
import { cn } from "@/lib/utils";

type Tinta = "ardesia" | "blu" | "oliva" | "viola";

/** Ogni categoria ha un colore e un'icona, sempre gli stessi in coda e nel dettaglio. */
export const ASPETTO_CATEGORIA: Record<Categoria, { Icona: LucideIcon; tinta: Tinta }> = {
  sinistro: { Icona: House, tinta: "ardesia" },
  reclamo: { Icona: MessageSquareWarning, tinta: "ardesia" },
  assistenza: { Icona: Wrench, tinta: "oliva" },
  modifica_polizza: { Icona: FilePen, tinta: "blu" },
  domanda_copertura: { Icona: ShieldQuestion, tinta: "blu" },
  altro: { Icona: MessageCircle, tinta: "blu" },
  preventivo: { Icona: Calculator, tinta: "viola" },
  pagamenti: { Icona: CreditCard, tinta: "viola" },
  disdetta: { Icona: FileX, tinta: "viola" },
};

const CLASSI_TINTA: Record<Tinta, string> = {
  ardesia: "bg-accent text-accent-foreground",
  blu: "bg-blu-chiaro text-blu-scuro",
  oliva: "bg-oliva-chiaro text-oliva-scuro",
  viola: "bg-viola-chiaro text-viola-scuro",
};

export function IconaCategoria({ categoria, className }: { categoria: Categoria; className?: string }) {
  const { Icona, tinta } = ASPETTO_CATEGORIA[categoria];
  return (
    <span
      aria-hidden
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", CLASSI_TINTA[tinta], className)}
    >
      <Icona className="size-5" strokeWidth={2.2} />
    </span>
  );
}

export function EtichettaCategoria({ categoria }: { categoria: Categoria }) {
  const { tinta } = ASPETTO_CATEGORIA[categoria];
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[13px] font-semibold", CLASSI_TINTA[tinta])}>
      {ETICHETTA_CATEGORIA[categoria]}
    </span>
  );
}
