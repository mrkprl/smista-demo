// Criteri di accettazione del §12 provati nel browser.
// Non dipendono dalle analisi precise: valgono sia con quelle scritte a mano sia con quelle dell'AI.
import { expect, test, type Page } from "@playwright/test";

const PAGINE = ["/", "/prova", "/impostazioni", "/come-funziona"];

function righe(page: Page) {
  return page.locator("ol button[data-id]:visible");
}

/** La coda si apre su "Da smistare": per vedere tutti i messaggi si sceglie il filtro "Tutti". */
async function mostraTutti(page: Page) {
  await page.getByRole("group", { name: "Filtra la coda" }).getByRole("button", { name: "Tutti" }).click();
}

async function apri(page: Page, id: string) {
  await page.goto(`/#${id}`);
  await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e")) {
      localStorage.clear();
      // Si entra con l'account demo; la prova dell'accesso parte invece da fuori.
      if (!location.search.includes("fuori")) {
        localStorage.setItem(
          "smista:sessione:v1",
          JSON.stringify({ nome: "Admin demo", ruolo: "admin", email: "admin@smista.demo", dal: new Date().toISOString() }),
        );
      }
      sessionStorage.setItem("e2e", "1");
    }
  });
});

test("ogni pagina si apre senza errori, con il piè di pagina e senza scroll orizzontale", async ({ page }) => {
  const errori: string[] = [];
  page.on("pageerror", (e) => errori.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errori.push(m.text());
  });
  for (const url of PAGINE) {
    await page.goto(url);
    await expect(page.getByText("Assicurazioni Esempio è una compagnia inventata", { exact: false })).toBeVisible();
    const largo = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(largo, `scroll orizzontale su ${url}`).toBe(false);
  }
  expect(errori).toEqual([]);
});

test("la coda si apre su Da smistare, con il gas in cima; Tutti mostra i 13 messaggi", async ({ page }) => {
  await page.goto("/");
  await expect(righe(page)).toHaveCount(10);
  await expect(righe(page).first()).toHaveAttribute("data-id", "m13");
  await expect(righe(page).first()).toContainText("Pericolo");
  await expect(page.locator("ol button[data-id]:visible", { hasText: "Risposta automatica" })).toHaveCount(0);
  await mostraTutti(page);
  await expect(righe(page)).toHaveCount(13);

  await apri(page, "m13");
  await expect(page.getByText("Chiama subito il cliente")).toBeVisible();
  await expect(page.getByText(/non accendere luci, interruttori o fiamme/)).toBeVisible();
});

test("il reclamo mostra il contatore dei 45 giorni", async ({ page }) => {
  await apri(page, "m06");
  await expect(page.getByText("8 giorni rimasti")).toBeVisible();
  await expect(page.getByText(/entro 45 giorni/)).toBeVisible();
});

test("il messaggio con istruzioni sospette è da rivedere e la bozza non si approva", async ({ page }) => {
  await apri(page, "m11");
  const dettaglio = page.getByRole("region", { name: "Dettaglio del messaggio" });
  await expect(dettaglio.getByText("Da rivedere", { exact: true })).toBeVisible();
  await expect(dettaglio.getByRole("alert").filter({ hasText: /istruzioni rivolte all'AI/ })).toBeVisible();
});

test("solo i messaggi 3, 8 e 12 partono in automatico", async ({ page }) => {
  await page.goto("/");
  await mostraTutti(page);
  const automatici = page.locator("ol button[data-id]:visible", { hasText: "Risposta automatica" });
  await expect(automatici).toHaveCount(3);
  const id = await automatici.evaluateAll((els) => els.map((e) => e.getAttribute("data-id")).sort());
  expect(id).toEqual(["m03", "m08", "m12"]);
});

test("cambiando i livelli dal pannello la coda si aggiorna, e l'urgenza alta non parte mai da sola", async ({
  page,
}) => {
  await page.goto("/impostazioni");
  for (const gruppo of await page.getByRole("radiogroup").all()) {
    await gruppo.getByRole("radio", { name: "Automatico" }).click();
  }
  await page.getByRole("link", { name: "Coda" }).click();
  await mostraTutti(page);
  await expect(righe(page)).toHaveCount(13);

  for (const riga of await righe(page).all()) {
    const testo = await riga.innerText();
    if (/\balta\b/.test(testo)) expect(testo).not.toContain("Risposta automatica");
  }

  await page.goto("/impostazioni");
  for (const gruppo of await page.getByRole("radiogroup").all()) {
    await gruppo.getByRole("radio", { name: "Solo persona" }).click();
  }
  await page.getByRole("link", { name: "Coda" }).click();
  await mostraTutti(page);
  await expect(page.locator("ol button[data-id]:visible", { hasText: "Risposta automatica" })).toHaveCount(0);

  await page.goto("/impostazioni");
  await page.getByRole("button", { name: "Ricomincia la demo" }).click();
  await page.getByRole("button", { name: "Conferma: azzera tutto" }).click();
  await page.goto("/");
  await mostraTutti(page);
  await expect(page.locator("ol button[data-id]:visible", { hasText: "Risposta automatica" })).toHaveCount(3);
});

test("Approva toglie il messaggio dallo smistamento e lo mette in attesa di risposta; si può annullare", async ({
  page,
}) => {
  await apri(page, "m04");
  await page.getByRole("button", { name: "Approva", exact: true }).filter({ visible: true }).click();
  const conferma = page.getByRole("status").filter({ hasText: "In attesa di risposta" });
  await expect(conferma).toBeVisible();
  await page.goto("/");
  await expect(page.locator('ol button[data-id="m04"]')).toHaveCount(0);

  await page.getByRole("group", { name: "Filtra la coda" }).getByRole("button", { name: "In attesa di risposta" }).click();
  await expect(page.locator('ol button[data-id="m04"]:visible')).toContainText("In attesa di risposta");

  await apri(page, "m04");
  await expect(page.getByText("In attesa di risposta del cliente.")).toBeVisible();
  await page.getByRole("button", { name: "Annulla" }).filter({ visible: true }).first().click();
  await page.goto("/");
  await expect(page.locator('ol button[data-id="m04"]:visible')).toContainText("Da vedere");
});

test("si può chiamare il cliente e il convenzionato con un tocco", async ({ page }) => {
  await apri(page, "m02");
  const dettaglio = page.getByRole("region", { name: "Dettaglio del messaggio" });
  await expect(dettaglio.getByRole("link", { name: "Chiama il cliente" })).toHaveAttribute("href", "tel:+393470001122");
  await expect(dettaglio.getByRole("link", { name: "Scrivi su WhatsApp" })).toHaveAttribute("href", "https://wa.me/393470001122");
  await expect(dettaglio.getByRole("link", { name: /Chiama 011 0000 2301/ })).toHaveAttribute("href", "tel:+3901100002301");

  await apri(page, "m13");
  await expect(dettaglio.getByRole("link", { name: "Chiama ora" })).toHaveAttribute("href", "tel:+393490003344");
  await dettaglio.getByRole("button", { name: "Segna come chiamato" }).click();
  await expect(page.getByRole("status").filter({ hasText: "In attesa di risposta" })).toBeVisible();
});

test("Prova tu mette il messaggio in coda e lo mostra solo come testo", async ({ page }) => {
  await page.route("/api/analizza", (route) =>
    route.fulfill({
      json: {
        analisi: {
          categoria: "sinistro",
          sottotipo: null,
          urgenza: "media",
          motivo_urgenza: "danno da verificare",
          pericolo_persone: false,
          intervento_assistenza: false,
          tipo_intervento: "nessuno",
          istruzioni_sospette: false,
          dati_estratti: { nome: null, numero_polizza: null, indirizzo: null, data_evento: null, descrizione: null },
          dati_mancanti: ["numero di polizza"],
          prossimo_passo: "chiedere la polizza",
          bozza_risposta: "Ci mandi il numero di polizza, grazie.",
          lingua: "it",
          confidenza: "alta",
        },
      },
    }),
  );
  await page.goto("/prova");
  const testo = '<script>alert("x")</script> si è rotto il vetro';
  await page.getByLabel("Il messaggio del cliente").fill(testo);
  await page.getByRole("button", { name: "Analizza e metti in coda" }).click();
  await expect(page).toHaveURL(/\/#p/);
  await expect(page.getByText(testo).filter({ visible: true }).first()).toBeVisible();
  // Su telefono il dettaglio prende il posto della coda: la riga c'è anche se nascosta.
  await expect(page.locator('ol button[data-id^="p"]')).toContainText("Prova");
});

test("Prova tu mostra il messaggio del limite giornaliero", async ({ page }) => {
  await page.route("/api/analizza", (route) =>
    route.fulfill({ status: 429, json: { errore: "Hai già fatto 5 analisi oggi, il massimo per questa demo. Riprova domani." } }),
  );
  await page.goto("/prova");
  await page.getByLabel("Il messaggio del cliente").fill("ciao");
  await page.getByRole("button", { name: "Analizza e metti in coda" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("5 analisi");
});

test("l'API rifiuta le richieste da altri siti", async ({ request }) => {
  const altro = await request.post("/api/analizza", {
    data: { testo: "ciao" },
    headers: { origin: "https://sito-altrui.example" },
  });
  expect(altro.status()).toBe(403);
});

test("senza chiave l'API risponde 503", async ({ request }) => {
  // Sul sito pubblicato la chiave c'è: la prova consumerebbe un'analisi vera.
  test.skip(Boolean(process.env.E2E_URL), "solo in locale");
  const stesso = await request.post("/api/analizza", { data: { testo: "ciao" } });
  expect(stesso.status()).toBe(503);
});

test("i tre riquadri in cima filtrano la coda", async ({ page }) => {
  await page.goto("/");
  const riquadri = page.getByRole("group", { name: "Mostra solo" });

  await riquadri.getByRole("button", { name: /da chiamare/ }).click();
  await expect(righe(page)).toHaveCount(1);
  await expect(righe(page).first()).toHaveAttribute("data-id", "m13");

  await riquadri.getByRole("button", { name: /in attesa/ }).click();
  await expect(righe(page)).toHaveCount(3);

  await riquadri.getByRole("button", { name: /aspettano te/ }).click();
  await expect(righe(page)).toHaveCount(9);

  // Secondo clic: si torna allo smistamento.
  await riquadri.getByRole("button", { name: /aspettano te/ }).click();
  await expect(righe(page)).toHaveCount(10);
});

test("per un intervento trova il cliente in gestionale e il convenzionato più vicino", async ({ page }) => {
  await apri(page, "m02");
  const dettaglio = page.getByRole("region", { name: "Dettaglio del messaggio" });
  await expect(dettaglio.getByText("Chiara Bosio")).toBeVisible();
  await expect(dettaglio.getByText("riconosciuto dal numero di telefono")).toBeVisible();
  await expect(dettaglio.getByText("Fabbro e falegname · convenzionato più vicino")).toBeVisible();
  await expect(dettaglio.getByText("Fabbro Rolando")).toBeVisible();

  await apri(page, "m08");
  await expect(dettaglio.getByText("Cliente non trovato nel gestionale.")).toBeVisible();
  await expect(dettaglio.getByText("convenzionato più vicino")).toHaveCount(0);
});

test("senza accesso si vede la schermata dell'account demo; si entra e si esce con un clic", async ({ page }) => {
  await page.goto("/?fuori");
  await expect(page.getByRole("heading", { name: "Accedi a Smista" })).toBeVisible();
  await expect(righe(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Impostazioni" })).toHaveCount(0);

  await page.getByRole("button", { name: "Entra come admin demo" }).click();
  await expect(righe(page)).toHaveCount(10);
  await page.reload();
  await expect(righe(page)).toHaveCount(10);

  await page.getByRole("button", { name: "Esci" }).click();
  await expect(page.getByRole("heading", { name: "Accedi a Smista" })).toBeVisible();

  await page.goto("/come-funziona");
  await expect(page.getByRole("heading", { name: "Come funziona", level: 1 })).toBeVisible();
});

test("una pratica in attesa di risposta si chiude e si riapre", async ({ page }) => {
  await apri(page, "m03");
  const dettaglio = page.getByRole("region", { name: "Dettaglio del messaggio" });
  await expect(dettaglio.getByText("In attesa di risposta del cliente.")).toBeVisible();
  await dettaglio.getByRole("button", { name: "Chiudi pratica" }).click();
  await expect(page.getByRole("status").filter({ hasText: "pratica chiusa" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("group", { name: "Filtra la coda" }).getByRole("button", { name: "Chiuse" }).click();
  await expect(righe(page)).toHaveCount(1);
  await expect(righe(page).first()).toContainText("Pratica chiusa");

  await apri(page, "m03");
  await expect(dettaglio.getByText("Pratica chiusa.")).toBeVisible();
  await expect(dettaglio.getByRole("button", { name: "Approva", exact: true })).toHaveCount(0);
  await dettaglio.getByRole("button", { name: "Riapri" }).click();
  await expect(dettaglio.getByText("In attesa di risposta del cliente.")).toBeVisible();
});

test("la schermata di accesso mostra solo la card, senza barra di navigazione", async ({ page }) => {
  await page.goto("/?fuori");
  await expect(page.getByRole("button", { name: "Entra come admin demo" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByText("Assicurazioni Esempio è una compagnia inventata", { exact: false })).toBeVisible();
});
