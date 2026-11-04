import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import { Analytics } from "@vercel/analytics/next";
import Accesso from "@/components/Accesso";
import Intestazione from "@/components/Intestazione";
import PieDiPagina from "@/components/PieDiPagina";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Smista", template: "%s · Smista" },
  description:
    "Progetto dimostrativo: smistamento con l'AI dei messaggi dei clienti di Assicurazioni Esempio, compagnia di assicurazione casa inventata. Dati di prova, nessun invio reale.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f8fafc" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Intestazione />
        <div className="flex flex-1 flex-col">
          <Accesso>{children}</Accesso>
        </div>
        <PieDiPagina />
        {/* Statistiche di visita anonime, senza cookie. Solo sulle build di Vercel: altrove lo script non esiste. */}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
