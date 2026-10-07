import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig } from "vite";
import base from "./vite.config";

/**
 * Build/preview de los E2E de Playwright: la MISMA config que producción, solo
 * que en `dist-e2e/` para no pisar nunca un `dist/` real. Lo usan
 * `scripts/e2e-build.mjs` (que además apunta Supabase a un servidor local de
 * mentira) y el `webServer` de `playwright.config.ts`.
 */
export default defineConfig((entorno: ConfigEnv) => {
  const config = (typeof base === "function" ? base(entorno) : base) as UserConfig;
  return mergeConfig(config, {
    build: { outDir: "dist-e2e", emptyOutDir: true },
    preview: { host: "127.0.0.1", port: Number(process.env.E2E_PORT ?? 4391), strictPort: true },
  });
});
