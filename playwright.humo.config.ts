import { defineConfig, devices } from "@playwright/test";

/**
 * Prueba rápida («humo») de la web contra una URL YA DESPLEGADA. Solo lectura:
 * no levanta ningún servidor ni toca datos (ver `e2e/humo/web.humo.ts`).
 *
 *   BASE_URL=https://web-casatomas.vercel.app npm run test:humo
 *
 * Entrada:
 *   BASE_URL                         obligatoria (URL https del entorno a probar)
 *   EXPECTED_COMMIT                  opcional: el `commit` de /version.json debe coincidir
 *   VERCEL_AUTOMATION_BYPASS_SECRET  opcional: solo para entornos protegidos por Vercel
 *   HUMO_CHROMIUM_PATH               opcional, SOLO en local: Chromium ya instalado
 *
 * No toca `playwright.config.ts` (la suite E2E normal): esa solo recoge `*.e2e.ts`.
 */
const BASE_URL = process.env.BASE_URL?.trim();
if (!BASE_URL) {
  throw new Error(
    "Falta BASE_URL: indica la URL a probar, p. ej. BASE_URL=https://web-casatomas.vercel.app npm run test:humo",
  );
}
try {
  new URL(BASE_URL);
} catch {
  throw new Error(`BASE_URL no es una URL válida: «${BASE_URL}». Ejemplo: https://web-casatomas.vercel.app`);
}

// Con el bypass de Vercel la traza guardaría la cabecera con el secreto: se apaga.
// (La cabecera la añade solo a las peticiones al propio sitio el test, ver
// `e2e/humo/web.humo.ts`: `extraHTTPHeaders` la mandaría también a Supabase y
// demás terceros.)
const conBypass = Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET);

const executablePath = process.env.HUMO_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e/humo",
  testMatch: "**/*.humo.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // 60 s: en frío (primera visita a la demo) la hidratación sola puede llevar
  // más de 15 s; ver `esperarHidratacion` en e2e/humo/web.humo.ts (TEC-09).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results/humo",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/humo" }],
    ["json", { outputFile: "test-results/humo-resultado.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: conBypass ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "movil",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
    },
  ],
});
