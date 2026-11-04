import { Check, CheckCheck, Clock, Eye, Phone, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ETICHETTA_STATO } from "@/lib/etichette";
import type { Stato } from "@/lib/tipi";
import { cn } from "@/lib/utils";

const STILE: Record<Stato, { classi: string; Icona: typeof Check }> = {
  da_vedere: { classi: "bg-secondary text-foreground ring-1 ring-border", Icona: Eye },
  da_rivedere: { classi: "bg-accent text-accent-foreground", Icona: RotateCcw },
  approvata: { classi: "bg-blu-chiaro text-blu-scuro", Icona: Clock },
  scartata: { classi: "bg-muted text-muted-foreground", Icona: X },
  chiusa: { classi: "bg-oliva text-white", Icona: CheckCheck },
  automatica: { classi: "bg-oliva text-white", Icona: Check },
  testo_fisso: { classi: "bg-pericolo text-primary-foreground", Icona: Phone },
};

export default function BadgeStato({ stato, className }: { stato: Stato; className?: string }) {
  const { classi, Icona } = STILE[stato];
  return (
    <Badge className={cn("h-6 px-2.5 text-[13px] font-semibold", classi, className)}>
      <Icona aria-hidden strokeWidth={3} />
      {ETICHETTA_STATO[stato]}
    </Badge>
  );
}

export function BadgeUrgenza({ urgenza }: { urgenza: "alta" | "media" | "bassa" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 px-2.5 text-[13px]",
        urgenza === "alta" && "border-primary bg-card font-semibold text-accent-foreground",
        urgenza === "media" && "border-border bg-card text-foreground",
        urgenza === "bassa" && "border-border bg-card text-muted-foreground",
      )}
    >
      Urgenza {urgenza}
    </Badge>
  );
}
