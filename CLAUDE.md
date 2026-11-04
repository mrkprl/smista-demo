@AGENTS.md

# Smista: regole del progetto

Progetto dimostrativo, dati di prova. Strumento interno per l'assistenza clienti di un'assicurazione casa: l'AI legge e propone, il codice applica regole fisse, l'operatore decide. La compagnia del demo, Assicurazioni Esempio, è inventata. Se qualcosa non torna o manca, fermarsi e chiedere.

## Come si lavora

- Per passi piccoli. Alla fine di ognuno: cosa è stato fatto, cosa è stato verificato, come provarlo.
- Prima i test, poi l'interfaccia. Le regole (`lib/regole.ts`) e i livelli di risposta hanno test verdi prima di toccare la UI.
- A ogni passo si riesamina il codice cercando errori e falle di sicurezza.
- Prima di scrivere codice Next.js, leggere la guida pertinente in `node_modules/next/dist/docs/` (Next 16.4, API cambiate).
- `npm run typecheck` e `npm test` verdi prima di ogni commit; `npm run e2e` (Playwright) prima di un rilascio.

## Regole fisse

- Nessun segreto nel repository. `.env*` in `.gitignore`, c'è `.env.example` con valori finti.
- Solo `lib/ai/` importa `@anthropic-ai/sdk`. Tutte le chiamate all'AI sono lato server e passano da `analizza()`.
- Il testo del cliente va nel messaggio utente tra tag `<messaggio>` (togliendo quelli scritti dal cliente), mai nel prompt di sistema. In pagina si mostra solo come testo, mai come HTML.
- I messaggi di "Prova tu" non si salvano. Si salvano solo i contatori dei limiti, con l'IP come hash HMAC con `SMISTA_SALE_IP`.
- Niente loghi, lettering, testi, immagini o nomi di compagnie reali. Il piè di pagina dice che Assicurazioni Esempio è inventata; intestazione e accesso mostrano "Progetto dimostrativo, dati di prova".
- Non lanciare `npm audit fix --force` (riporta `eslint-config-next` alla 14).
- Con `cacheComponents` non si esporta `runtime` dalle route (vedi docs `cacheComponents.md`).
- Dati in Europa: Vercel `fra1`, database in region UE. L'API di Anthropic non ha region UE: va detto nella pagina "Come funziona".

## Decisioni prese

- **Orari dei messaggi di esempio relativi** al caricamento della pagina (`ricevutoDaMinuti`). Il reclamo #6 è ricevuto 37 giorni fa → 8 giorni rimasti.
- **Grafica**: shadcn/ui (Radix, `components/ui/`), aspetto neutro, senza colori o marchi di compagnie reali. DM Sans (`@fontsource-variable/dm-sans`, in locale), sfondo bianco con sezioni `#f5f6f8`, schede bianche da 20px con ombra morbida e bordo di 3px quando selezionate, pulsanti da 12-15px con sfumatura ardesia `#334155`→`#4b5d75` (`bg-primario`), icone Lucide. Colori per categoria (`components/Categoria.tsx`): ardesia (grigio chiaro), blu `#4f72bc`, oliva `#6c7b3e`, viola `#795da5`; oliva anche per "fatto/automatico". Token in `app/globals.css`, stati in `components/BadgeStato.tsx`. Su computer il dettaglio è sticky e scorre per conto suo; da `xl` è su due colonne (sinistra: messaggio e AI; destra: cliente, tecnico, risposta) e deve stare senza scendere in 1366×768, 1440×900 e 1920×1080 (misurato con Playwright su tutti i 13 esempi; a 1280×720 10 su 13). Coda larga 410px da `xl`. Con il pericolo, "Segna come chiamato" sta dentro il riquadro rosso (`bg-pericolo`, `#b42318`→`#d92d20`). "Da chiedere" toglie i dati già noti dal gestionale o dal canale WhatsApp (`daChiedere` in `lib/gestionale.ts`), senza mandare dati dei clienti all'AI. La bozza ha altezza fissa da `xl`; le note secondarie si nascondono sotto i 860px di altezza.
- **Contatore reclami sotto i 10 giorni in rosso** `#b42318`.
- `shadcn` sta nelle devDependencies: serve solo il suo `tailwind.css` in build; in produzione porterebbe vulnerabilità del CLI.
- **Stato della pagina in localStorage** (livelli, approvazioni, scarti, bozze, correzioni) con try/catch e "Ricomincia la demo". I messaggi di "Prova tu" solo in memoria.
- **Lista promesse anche in inglese** oltre a quella italiana, più femminili e plurali ("è coperta", "sono coperti", "rimborsiamo", "rimborsat", "risarciremo").
- **Output strutturato** con `output_config.format` (non il tool use). Zod importato da `zod/v4`.
- **Stati**: `da_vedere`, `da_rivedere`, `approvata`, `scartata`, `automatica` (partita in automatico), `testo_fisso` (pericolo persone: testo fisso inviato, aspetta una telefonata). `testo_fisso` non conta tra gli automatici.
- **Stato iniziale**: `da_rivedere` se confidenza bassa, istruzioni sospette o livello "solo persona"; altrimenti `da_vedere`.
- **Giorno dei limiti** = data in Europe/Rome. Il contatore conta i tentativi validi, anche se poi l'AI fallisce (protegge i costi).
- **Ordine della coda**: i reclami stanno nella loro fascia (dopo le urgenze alte) qualunque sia l'urgenza, ordinati per scadenza.
- **`messages.create` + validazione Zod a mano** invece di `messages.parse`, per leggere `stop_reason` (rifiuto, troncata) prima della validazione. Gli `enum` vanno rimessi nello schema perché l'helper dell'SDK 0.135 li toglie (vedi SETUP.md).
- **Testi fissi**: uno per il gas; un testo generico per fumo, incendio, crollo, impianto elettrico, da validare. Il testo del gas solo se si parla di gas e di nessun altro pericolo (con fumo o fuoco "apri le finestre" sarebbe sbagliato).
- **API solo dalla pagina della demo**: `Origin` diverso dall'host o `sec-fetch-site: cross-site` → 403, prima di consumare la quota. IP letto prima da `x-vercel-forwarded-for` e `x-real-ip`, poi da `x-forwarded-for`.
- **Header di sicurezza** in `next.config.ts`: CSP senza nonce (con i nonce le pagine non si prerenderizzano), `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy.
- **Filtro "Da gestire"** = da vedere + da rivedere + telefonate da fare. La frase di riepilogo conta le telefonate a parte.

- **Tecnico e convenzionato più vicino**: l'AI sceglie solo `tipo_intervento` (sei tipi di tecnico, più "nessuno"). Il codice (`lib/gestionale.ts`) riconosce il cliente nel gestionale finto (`data/gestionale.ts`) per polizza, poi telefono, poi nome, mai a caso; usa l'indirizzo dell'immobile in polizza, o solo la città scritta nel messaggio, e sceglie i convenzionati entro 50 km in linea d'aria. Se l'indirizzo nel messaggio è diverso da quello in polizza lo segnala. Clienti e convenzionati sono inventati.
- Un danno già avvenuto resta `sinistro` anche se serve un tecnico (regola nel prompt, aggiunta perché l'AI spostava il messaggio 1 in `assistenza`).

- **Accesso demo**: un solo account "Admin demo", nessuna password, un pulsante "Entra come admin demo" (`components/Accesso.tsx`, `lib/demo/sessione.ts`, in localStorage). Non è sicurezza e lo dice: il login vero è fuori dallo scopo del demo. Senza accesso si vede solo "Come funziona". La pagina si disegna sempre e resta `hidden` finché non si entra, altrimenti la verifica della navigazione istantanea di Next (cacheComponents) segnala il segmento come non disegnato.

- **Dopo l'invio la pratica esce dallo smistamento**: la coda si apre su "Da smistare" (da vedere, da rivedere, telefonate da fare). Approva o "Segna come chiamato" → stato `approvata`, mostrato come "In attesa di risposta" insieme alle risposte automatiche; la scheda passa al messaggio successivo (su telefono torna alla coda) e compare una conferma con "Annulla". Da "In attesa di risposta" la pratica si chiude con "Chiudi pratica" (stato `chiusa`, filtro "Chiuse") e si riapre con "Riapri" (`azioneRiapri`: torna in attesa, o automatica se la risposta era partita da sola). Filtri: Da smistare, In attesa di risposta, Chiuse, Scartati, Tutti. La schermata di accesso non ha la barra di navigazione: solo la card (e il piè di pagina).
- **Chiamare con un tocco**: "Chiama il cliente" (numero WhatsApp o del gestionale, `telefonoCliente`), "Scrivi su WhatsApp" se il messaggio arriva da lì, "Chiama" sul convenzionato, "Chiama ora" nel riquadro del pericolo. Link `tel:` e `wa.me`; i numeri sono finti.

- **Vercel Web Analytics**: `<Analytics />` nel layout, solo se `VERCEL=1` (altrove lo script non esiste e darebbe errori in console). Anonimo, senza cookie; Vercel non indica la region dei dati. Si attiva anche dalla scheda Analytics del progetto su Vercel.

## Variabili d'ambiente

Vedi `.env.example`: `ANTHROPIC_API_KEY`, `SMISTA_MODELLO` (default `claude-sonnet-5-5`), `DATABASE_URL`, `SMISTA_SALE_IP`.
