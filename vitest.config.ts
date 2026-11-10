import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import {
  CARTA_SSG_VACIA,
  VINOS_SSG_VACIOS,
  BEBIDAS_SSG_VACIAS,
  TIENDA_SSG_VACIA,
  TIENDA_VISIBLE_SSG_VACIA,
} from "./scripts/carta-ssg.mjs";
import { NOVEDADES_SSG_VACIA } from "./scripts/novedades-ssg.mjs";

/**
 * Los `virtual:carta-ssg*` los sirve el plugin `carta-ssg` de `vite.config.ts`
 * descargando la carta de Supabase. En los tests se devuelven vacíos: ningún
 * test depende del contenido y no queremos que la suite dependa de la red.
 */
const VACIOS: Record<string, unknown> = {
  "virtual:carta-ssg": CARTA_SSG_VACIA,
  "virtual:carta-ssg/vinos": VINOS_SSG_VACIOS,
  "virtual:carta-ssg/bebidas": BEBIDAS_SSG_VACIAS,
  "virtual:carta-ssg/tienda": TIENDA_SSG_VACIA,
  "virtual:carta-ssg/tienda-visible": TIENDA_VISIBLE_SSG_VACIA,
  // Sin esto ningún test podía importar NovedadesSection (ni nada que la use).
  "virtual:novedades-ssg": NOVEDADES_SSG_VACIA,
};

const cartaSsgStub = (): Plugin => ({
  name: "carta-ssg-stub",
  resolveId: (id) => (id in VACIOS ? `\0${id}` : undefined),
  load: (id) => {
    const virtual = Object.keys(VACIOS).find((candidato) => `\0${candidato}` === id);
    return virtual ? `export default ${JSON.stringify(VACIOS[virtual])};` : undefined;
  },
});

export default defineConfig({
  plugins: [react(), cartaSsgStub()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    // `supabase/functions/**` es código Deno: sus tests usan `Deno.test` e
    // imports `npm:`/`https:` y se lanzan con `deno test`, no con vitest. Los
    // tests de la web que prueban piezas de esas funciones viven en
    // `src/__tests__/` (p. ej. `FacturaEmail.test.ts`) y se siguen ejecutando.
    exclude: ["node_modules/**", "dist/**", "dist-e2e/**", "supabase/functions/**"],
    alias: {
      "framer-motion": path.resolve(__dirname, "./src/__mocks__/framer-motion.tsx"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/__tests__/**",
        "src/integrations/**",
        "src/components/ui/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
