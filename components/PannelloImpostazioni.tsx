"use client";

import { useState } from "react";
import { azioni, useStatoDemo } from "@/lib/demo/stato";
import { DESCRIZIONE_LIVELLO, ETICHETTA_CATEGORIA, ETICHETTA_LIVELLO } from "@/lib/etichette";
import { CATEGORIE, LIVELLI } from "@/lib/tipi";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PannelloImpostazioni() {
  const { impostazioni } = useStatoDemo();
  const [conferma, setConferma] = useState(false);

  return (
    <>
      <ul className="mt-6 divide-y ombra-scheda rounded-[20px] border bg-card px-5">
        {CATEGORIE.map((c) => (
          <li key={c} className="flex flex-col gap-2.5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span id={`cat-${c}`} className="font-semibold">
              {ETICHETTA_CATEGORIA[c]}
            </span>
            <div role="radiogroup" aria-labelledby={`cat-${c}`} className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 sm:flex sm:rounded-full">
              {LIVELLI.map((l) => {
                const scelto = impostazioni[c] === l;
                return (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={scelto}
                    title={DESCRIZIONE_LIVELLO[l]}
                    onClick={() => azioni.impostaLivello(c, l)}
                    className={cn(
                      "cursor-pointer rounded-xl px-2 py-1.5 text-center text-[13px] leading-tight font-semibold transition-colors sm:rounded-full sm:px-3.5 sm:text-sm",
                      scelto ? "bg-primario text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    {ETICHETTA_LIVELLO[l]}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button
          variant={conferma ? "default" : "outline"}
          onClick={() => {
            if (conferma) {
              azioni.ricomincia();
              setConferma(false);
            } else setConferma(true);
          }}
        >
          <RotateCcw aria-hidden />
          {conferma ? "Conferma: azzera tutto" : "Ricomincia la demo"}
        </Button>
        <p className="mt-2 text-sm text-muted-foreground">
          Riporta livelli, approvazioni, bozze e correzioni allo stato iniziale. Sono salvati solo in questo browser.
        </p>
      </div>
    </>
  );
}
