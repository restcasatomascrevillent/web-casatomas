import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import {
  CARTA_SSG_VACIA,
  VINOS_SSG_VACIOS,
  BEBIDAS_SSG_VACIAS,
} from "./scripts/carta-ssg.mjs";

/**
 * Los `virtual:carta-ssg*` los sirve el plugin `carta-ssg` de `vite.config.ts`
 * descargando la carta de Supabase. En los tests se devuelven vacíos: ningún
 * test depende del contenido y no queremos que la suite dependa de la red.
 */
const VACIOS: Record<string, unknown> = {
  "virtual:carta-ssg": CARTA_SSG_VACIA,
  "virtual:carta-ssg/vinos": VINOS_SSG_VACIOS,
  "virtual:carta-ssg/bebidas": BEBIDAS_SSG_VACIAS,
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
    exclude: ["node_modules/**", "dist/**"],
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
