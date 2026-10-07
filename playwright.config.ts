import { defineConfig, devices } from "@playwright/test";

/**
 * E2E del formulario de reserva contra el build SSG REAL (`vite preview` de
 * `dist-e2e/`, ver `scripts/e2e-build.mjs`). Nunca se habla con Supabase: el
 * bundle apunta a un host local de mentira y los tests interceptan con
 * `context.route` la llamada a `reservas-web` y bloquean todo lo externo.
 *
 *   npm run test:e2e         -> build E2E + playwright test
 *   npx playwright test      -> solo los tests (reutiliza el dist-e2e/ que haya)
 */
const PUERTO = Number(process.env.E2E_PORT ?? 4391);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite preview -c vite.config.e2e.ts",
    url: `http://127.0.0.1:${PUERTO}/`,
    // Nunca reutilizar un servidor ajeno en ese puerto: se probaría otro build
    // (p. ej. un `vite preview` normal apuntando a Supabase de verdad).
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
