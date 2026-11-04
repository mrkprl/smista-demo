import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import PannelloImpostazioni from "@/components/PannelloImpostazioni";

export const metadata: Metadata = { title: "Impostazioni" };

export default function Pagina() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
        Livelli di <span className="text-primary">risposta</span>
      </h1>
      <p className="mt-3 max-w-[65ch] text-lg leading-relaxed">
        Per ogni categoria decidi tu se la risposta parte da sola, aspetta la tua approvazione o la scrivi tu.
        L&apos;AI non lo decide.
      </p>
      <p className="mt-3 max-w-[65ch] leading-relaxed">
        Anche con “Automatico”, una risposta parte solo se la confidenza è alta, l&apos;urgenza non è alta e non c&apos;è
        nessun avviso. Altrimenti diventa una bozza da approvare, con il motivo scritto.
      </p>
      <PannelloImpostazioni />
      <section className="mt-8 rounded-[20px] bg-oliva-chiaro p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <ShieldCheck aria-hidden className="size-5 text-oliva" />
          Due casi fissi, che qui non si cambiano
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
          <li>
            Pericolo per le persone (gas, fumo, incendio): parte subito un testo scritto da una persona e compare “Chiama
            subito il cliente”.
          </li>
          <li>Istruzioni sospette nel messaggio: sempre “Solo persona”.</li>
        </ul>
      </section>
    </main>
  );
}
