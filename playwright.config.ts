import { defineConfig, devices } from "@playwright/test";

const PORTA = 3997;
/** Con E2E_URL le prove girano sul sito pubblicato invece che su una build locale. */
const ESTERNO = process.env.E2E_URL;

// In locale gira sulla build di produzione, senza chiave API né database: "Prova tu" usa una risposta simulata.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: ESTERNO ?? `http://localhost:${PORTA}` },
  projects: [
    { name: "computer", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "telefono", use: { ...devices["Pixel 7"] } },
  ],
  webServer: ESTERNO
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORTA}`,
        url: `http://localhost:${PORTA}`,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: { ANTHROPIC_API_KEY: "", DATABASE_URL: "" },
      },
});
