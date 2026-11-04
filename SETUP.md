# Smista: setup e note

## In locale

```bash
npm install
cp .env.example .env.local   # poi compila ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # Vitest
npm run typecheck            # next typegen + tsc
npm run e2e                  # Playwright: criteri di accettazione su build di produzione, computer e telefono
```

In sviluppo, senza `DATABASE_URL`, i contatori dei limiti stanno in memoria. Senza `ANTHROPIC_API_KEY` "Prova tu" risponde 503.

## Analisi dei messaggi di esempio e valutazione

```bash
npm run analizza-esempi   # 13 chiamate, scrive data/analisi-esempi.json (origine "ai")
npm run valuta            # 39 chiamate (13 × 3), scrive data/valutazione.json
```

Gli script leggono `.env.local` da soli (`tsx --env-file-if-exists`). Finché `data/analisi-esempi.json` ha `origine: "scritte_a_mano"`, la coda mostra un avviso "Anteprima" e la pagina Come funziona lo dice. I test della coda in `lib/demo/coda.test.ts` girano solo sulle analisi scritte a mano: con quelle dell'AI i criteri si misurano con `npm run valuta`. Dopo aver generato le analisi vere, rilancia `npm run e2e`: le prove nel browser valgono con qualsiasi analisi, ma controllano che 3, 8 e 12 partano in automatico e che il gas resti in cima.

## Database (contatori dei limiti)

Serve solo in produzione, per i limiti giornalieri di "Prova tu". Qualsiasi Postgres va bene (per esempio Neon, in region UE).

1. Esegui `db/schema.sql`.
2. Crea un ruolo con privilegi minimi come in `db/ruolo-app.sql` (solo select, insert, update), con una password casuale che non scrivi su disco.
3. Usa la connection string di quel ruolo come `DATABASE_URL`.

## Vercel

- Region delle funzioni: `fra1` (in `vercel.json`).
- Variabili: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `SMISTA_SALE_IP` (`openssl rand -hex 32`), facoltativa `SMISTA_MODELLO`.
- In produzione, senza `DATABASE_URL` o `SMISTA_SALE_IP`, "Prova tu" risponde 503 apposta.
- Prove nel browser su un sito pubblicato: `E2E_URL=https://<il-tuo-sito> npm run e2e`.
- Imposta un limite di spesa mensile sulla console di Anthropic.

## Sorprese incontrate

- **`zodOutputFormat` dell'SDK 0.135 toglie gli `enum`** dallo schema e li mette nella descrizione. L'API li supporta, quindi `formatoAnalisi()` in `lib/ai/analizza.ts` li rimette (c'è un test). Se si aggiorna l'SDK, ricontrollare.
- **`messages.parse()` valida prima di farti leggere `stop_reason`**: con una risposta troncata o un rifiuto lancia un errore generico. Per questo si usa `messages.create()` con lo stesso formato e la validazione Zod fatta a mano.
- La documentazione avverte che i valori enum possono tornare con maiuscole diverse: si normalizzano prima della validazione.
- **Con `cacheComponents` non si esporta `runtime`** dalle route. E `new Date()` nel render rompe il prerender: gli orari relativi si calcolano da un riferimento fisso (`ORA_RIFERIMENTO` in `lib/demo/coda.ts`).
- `LayoutProps` è generato da Next: il type check richiede `next typegen` prima di `tsc`.
- `npm audit` segnala 5 vulnerabilità alte, tutte in strumenti di sviluppo (`eslint-config-next` → `braces`). Non usare `npm audit fix --force`.
