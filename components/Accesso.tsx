"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accesso, ACCOUNT_DEMO, serveAccesso, useSessione } from "@/lib/demo/sessione";

/** Mostra la pagina solo dopo l'accesso demo. "Come funziona" resta visibile a tutti. */
export default function Accesso({ children }: { children: React.ReactNode }) {
  const percorso = usePathname();
  const sessione = useSessione();

  const visibile = !serveAccesso(percorso) || Boolean(sessione);

  // La pagina si disegna sempre (serve alla verifica della navigazione istantanea di Next) e resta
  // nascosta finché non si entra. Finché il browser non ha letto la sessione non si mostra nulla,
  // così la schermata di accesso non lampeggia. Non è sicurezza: i dati della demo sono pubblici.
  return (
    <>
      <div hidden={!visibile} className={visibile ? "flex flex-1 flex-col" : undefined}>
        {children}
      </div>
      {!visibile && sessione === null && <SchermataAccesso />}
      {!visibile && sessione === undefined && <div className="flex-1" aria-busy="true" />}
    </>
  );
}

function SchermataAccesso() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted px-4 py-10 sm:py-16">
      <div className="ombra-scheda w-full max-w-md rounded-[20px] bg-card p-6 sm:p-8">
        <Image src="/smista-wordmark.svg" alt="Smista" width={1525} height={351} unoptimized className="h-9 w-auto" />
        <h1 className="sr-only">Accedi a Smista</h1>
        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">
          <FlaskConical aria-hidden className="size-3.5" />
          Progetto dimostrativo, dati di prova
        </p>
        <p className="mt-4 text-[17px] leading-relaxed">
          Lo strumento che smista i messaggi dei clienti di Assicurazioni Esempio: l&apos;AI legge, il codice controlla,
          tu decidi.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[15px] bg-muted p-4">
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primario font-bold text-primary-foreground">
            AD
          </span>
          <div className="min-w-0 flex-1 max-sm:min-w-[11rem]">
            <p className="font-bold">{ACCOUNT_DEMO.nome}</p>
            <p className="truncate text-sm text-muted-foreground">{ACCOUNT_DEMO.email}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-oliva-chiaro px-2.5 py-1 text-[13px] font-semibold text-oliva-scuro max-sm:ml-14 sm:ml-auto">
            <ShieldCheck aria-hidden className="size-3.5" />
            Tutti i permessi
          </span>
        </div>

        <Button size="lg" className="mt-4 w-full" onClick={() => accesso.entra()}>
          <LogIn aria-hidden />
          Entra come admin demo
        </Button>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Accesso di prova: nessuna password, dati inventati. Resta attivo in questo browser finché non esci.
        </p>
        <p className="mt-3 text-sm">
          Prima vuoi capire come funziona?{" "}
          <Link href="/come-funziona" className="font-semibold text-primary underline-offset-4 hover:underline">
            Leggi qui
          </Link>
        </p>
      </div>
    </main>
  );
}
