"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { accesso, serveAccesso, useSessione } from "@/lib/demo/sessione";
import { cn } from "@/lib/utils";

const VOCI = [
  { href: "/", testo: "Coda" },
  { href: "/prova", testo: "Prova tu" },
  { href: "/impostazioni", testo: "Impostazioni" },
  { href: "/come-funziona", testo: "Come funziona" },
] as const;

export default function Intestazione() {
  const percorso = usePathname();
  const router = useRouter();
  const sessione = useSessione();
  // Nella schermata di accesso c'è solo la card: niente barra.
  if (sessione === null && serveAccesso(percorso)) return null;
  // Senza accesso si vede solo "Come funziona": le altre voci porterebbero alla schermata di accesso.
  const voci = sessione ? VOCI : VOCI.filter((v) => v.href === "/come-funziona");
  return (
    <header className="sticky top-0 z-20 bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 xl:max-w-[88rem]">
        <Link href="/" className="flex items-center py-1">
          <Image src="/smista-wordmark.svg" alt="Smista" width={1525} height={351} priority unoptimized className="h-7 w-auto" />
        </Link>
        <span className="order-1 hidden rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground md:inline">
          Progetto dimostrativo, dati di prova
        </span>
      {sessione && (
        <span className="order-2 ml-auto flex items-center gap-2 text-sm font-semibold sm:order-3 sm:ml-0 sm:border-l sm:pl-3">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full bg-primario text-[13px] font-bold text-primary-foreground"
          >
            AD
          </span>
          <span className="hidden text-foreground lg:inline">{sessione.nome}</span>
          <button
            type="button"
            onClick={() => {
              accesso.esci();
              router.push("/");
            }}
            className="flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut aria-hidden className="size-4" />
            Esci
          </button>
        </span>
      )}
        <nav
          aria-label="Sezioni"
          className={cn(
            "-mx-1 flex flex-wrap items-center gap-0.5 text-sm font-semibold sm:gap-1",
            // Con l'accesso il menu ha quattro voci: su telefono va sotto il logo, su una riga.
            sessione ? "order-3 w-[calc(100%+0.5rem)] sm:order-2 sm:ml-auto sm:w-auto" : "ml-auto",
          )}
        >
          {voci.map((v) => {
            const attiva = percorso === v.href;
            return (
              <Link
                key={v.href}
                href={v.href}
                aria-current={attiva ? "page" : undefined}
                className={cn(
                  "rounded-full px-2.5 py-1.5 whitespace-nowrap transition-colors sm:px-3.5 sm:py-2",
                  attiva ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {v.testo}
              </Link>
            );
          })}
          {sessione === null && percorso === "/come-funziona" && (
            <Link href="/" className="ml-1 rounded-full bg-primario px-3.5 py-1.5 text-primary-foreground sm:ml-2 sm:py-2">
              Accedi
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
