import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { rm } from "fs/promises";
import { fetchCartaSSG, CARTA_SSG_VACIA } from "./scripts/carta-ssg.mjs";
import { fetchNovedadesSSG, NOVEDADES_SSG_VACIA } from "./scripts/novedades-ssg.mjs";
import { generarSitemapYRobots } from "./scripts/generate-sitemap.mjs";
import { htmlDePublic, verificarHtmlPrerenderizado } from "./scripts/verificar-html.mjs";

/**
 * Un `fetch` a Supabase, TRES módulos virtuales.
 *
 * `virtual:carta-ssg` (platos + recuentos de vinos/bebidas) lo importa la
 * portada, así que tiene que seguir siendo barato. Las 185 filas de vinos y las
 * 75 de bebidas viven en módulos aparte para que solo entren en el chunk de
 * `/carta/vinos` y `/carta/bebidas` — rutas perezosas — y nunca en el bundle de
 * la home, que es lo que motivó dejarlas fuera en su día.
 */
const MODULOS = {
  "virtual:carta-ssg": (carta: CartaDescargada) => ({
    generadoEn: carta.generadoEn,
    platos: carta.platos,
    resumen: carta.resumen,
    // Interruptor «Fotos de platos en Casa Tomás» (ver `leerMostrarFotosPlatos`).
    config: carta.config ?? { mostrarFotosPlatos: true },
  }),
  "virtual:carta-ssg/vinos": (carta: CartaDescargada) => ({
    generadoEn: carta.generadoEn,
    vinos: carta.vinos ?? [],
  }),
  "virtual:carta-ssg/bebidas": (carta: CartaDescargada) => ({
    generadoEn: carta.generadoEn,
    bebidas: carta.bebidas ?? [],
  }),
};

/**
 * Lo que devuelve `fetchCartaSSG`. `vinos`/`bebidas` son opcionales porque
 * `CARTA_SSG_VACIA` (el reemplazo de `dev` sin red) no los trae.
 */
interface CartaDescargada {
  generadoEn: string;
  platos: unknown[];
  vinos?: unknown[];
  bebidas?: unknown[];
  resumen: unknown;
  config?: { mostrarFotosPlatos: boolean };
}

type VirtualId = keyof typeof MODULOS;

const VIRTUAL_IDS = Object.keys(MODULOS) as VirtualId[];
const esVirtual = (id: string): id is VirtualId => VIRTUAL_IDS.includes(id as VirtualId);
/** Convención de Rollup: el id resuelto de un módulo virtual empieza por NUL. */
const resolverId = (id: VirtualId) => `\0${id}`;

/**
 * Trae la carta de Supabase en build y la expone como `virtual:carta-ssg`.
 *
 * Por qué un módulo virtual y no un `loader` de react-router (que es lo que
 * documenta vite-react-ssg): en cliente `transformStaticLoaderRoute`
 * (`node_modules/vite-react-ssg/dist/index.mjs:162`) sustituye el loader por un
 * `fetch` asíncrono del JSON estático, y `RouterProvider` pinta `fallbackElement`
 * mientras `state.initialized === false`. Comprobado en el build actual: el
 * `loaderData` del cliente solo trae la ruta raíz (`{"0": null}`), la hija no
 * recibe nada. Con un loader real, `useLoaderData()` estaría vacío justo en la
 * hidratación y el HTML prerenderizado no cuadraría con el primer render.
 *
 * Un módulo virtual es el MISMO módulo en Node y en el navegador, así que el
 * render del SSG y el de la hidratación son idénticos por construcción: cero
 * desajustes, cero peticiones extra.
 */
function cartaSsgPlugin(env: Record<string, string>, { requerido }: { requerido: boolean }): Plugin {
  // `vite-react-ssg build` lanza dos builds (cliente y SSR) y cada uno resuelve
  // la config de nuevo. Se cachea fuera del plugin para consultar Supabase una vez.
  const CACHE = Symbol.for("casa-tomas.carta-ssg");
  const global = globalThis as Record<symbol, unknown>;

  return {
    name: "carta-ssg",
    resolveId: (id) => (esVirtual(id) ? resolverId(id) : undefined),
    async load(id) {
      const virtual = VIRTUAL_IDS.find((candidato) => resolverId(candidato) === id);
      if (!virtual) return undefined;

      if (!global[CACHE]) {
        global[CACHE] = (async () => {
          try {
            return await fetchCartaSSG({
              url: env.VITE_SUPABASE_URL,
              key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
            });
          } catch (error) {
            // En `build` se rompe: mejor no desplegar que publicar una carta vacía.
            if (requerido) throw error;
            // En `dev` basta con avisar: trabajar sin red no debe bloquear.
            this.warn(`${(error as Error).message}\n  → se sirve una carta vacía (solo en dev).`);
            return CARTA_SSG_VACIA;
          }
        })();
      }

      const carta = await (global[CACHE] as Promise<CartaDescargada>);
      return `export default ${JSON.stringify(MODULOS[virtual](carta))};`;
    },
  };
}

/** Lo que devuelve `fetchNovedadesSSG`. */
interface NovedadesDescargadas {
  generadoEn: string;
  novedades: unknown[];
}

const VIRTUAL_NOVEDADES = "virtual:novedades-ssg";
const RESOLVED_NOVEDADES = `\0${VIRTUAL_NOVEDADES}`;

/**
 * Trae "novedades" de Supabase en build y la expone como
 * `virtual:novedades-ssg` — mismo patrón que `cartaSsgPlugin` de arriba,
 * plugin aparte porque es OTRA tabla, sin relación con la carta, y con una
 * política de errores distinta (ver `scripts/novedades-ssg.mjs`: una tabla
 * vacía no rompe el build, una petición que falla sí).
 */
function novedadesSsgPlugin(env: Record<string, string>, { requerido }: { requerido: boolean }): Plugin {
  const CACHE = Symbol.for("casa-tomas.novedades-ssg");
  const global = globalThis as Record<symbol, unknown>;

  return {
    name: "novedades-ssg",
    resolveId: (id) => (id === VIRTUAL_NOVEDADES ? RESOLVED_NOVEDADES : undefined),
    async load(id) {
      if (id !== RESOLVED_NOVEDADES) return undefined;

      if (!global[CACHE]) {
        global[CACHE] = (async () => {
          try {
            return await fetchNovedadesSSG({
              url: env.VITE_SUPABASE_URL,
              key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
            });
          } catch (error) {
            // En `build` se rompe: una petición que falla (red, HTTP,
            // credenciales) no se enmascara nunca. En `dev`/test basta con
            // avisar: trabajar sin red no debe bloquear.
            if (requerido) throw error;
            this.warn(`${(error as Error).message}\n  → se sirven 0 novedades (solo en dev).`);
            return NOVEDADES_SSG_VACIA;
          }
        })();
      }

      const novedades = await (global[CACHE] as Promise<NovedadesDescargadas>);
      return `export default ${JSON.stringify(novedades)};`;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || "https://restaurantecasatomascrevillente.es").replace(/\/+$/, "");

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      cartaSsgPlugin(env, { requerido: command === "build" }),
      novedadesSsgPlugin(env, { requerido: command === "build" }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Las variantes del logo (src/assets/logo/*.png) pesan <4 KB y Vite las
      // incrustaría como base64 en el JS y en cada HTML prerenderizado (todas las
      // del srcset, no solo la que elige el navegador). Como fichero aparte se
      // descargan una vez y quedan en caché `immutable` bajo /assets.
      assetsInlineLimit: (filePath: string) =>
        filePath.replace(/\\/g, "/").includes("/src/assets/logo/") ? false : undefined,
    },
    ssgOptions: {
      // `sitemap.xml` y `robots.txt` se generan aquí, con las rutas que el build
      // ha emitido de verdad, en vez de mantenerlos a mano en `public/`.
      onFinished: async (dir: string) => {
        // vite-react-ssg fuerza `manifest`/`ssrManifest` y los LEE al prerenderizar,
        // así que no se pueden desactivar; pero ya no hacen falta y en `dist/` se
        // publicarían (/.vite/manifest.json, /.vite/ssr-manifest.json).
        await rm(path.join(path.resolve(dir), ".vite"), { recursive: true, force: true });
        // Un solo `<html` por página y con el `lang` de su idioma; si no, el build falla.
        // Los `.html` de `public/` (p. ej. la verificación de Search Console) se
        // copian tal cual, no los prerenderiza nadie: quedan fuera de la comprobación.
        const dePublic = await htmlDePublic(path.resolve(__dirname, "public"));
        const paginas = await verificarHtmlPrerenderizado(path.resolve(dir), { ignorar: dePublic });
        // eslint-disable-next-line no-console
        console.log(`[verificar-html] ${paginas} páginas: un solo <html> y lang correcto`);
        // El sitemap tampoco los lista: no son páginas del sitio.
        const rutas = await generarSitemapYRobots(dir, siteUrl, { ignorar: dePublic });
        // eslint-disable-next-line no-console
        console.log(`[sitemap] ${rutas.length} URLs indexables: ${rutas.join(", ")}`);
      },
    },
  };
});
