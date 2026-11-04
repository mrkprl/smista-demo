import type { Metadata } from "next";
import ProvaTu from "@/components/ProvaTu";

export const metadata: Metadata = { title: "Prova con un tuo messaggio" };

export default function Pagina() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
        Prova con un <span className="text-primary">tuo messaggio</span>
      </h1>
      <p className="mt-3 max-w-[65ch] text-lg leading-relaxed">
        Scrivi come se fossi un cliente. L&apos;AI lo analizza dal vivo e il messaggio entra in coda con le stesse regole
        degli esempi. Non viene salvato: se ricarichi la pagina, sparisce.
      </p>
      <ProvaTu />
    </main>
  );
}
