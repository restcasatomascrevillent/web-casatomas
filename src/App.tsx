import { lazy, Suspense, type ComponentType } from "react";
import type { RouteRecord } from "vite-react-ssg";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import CookieConsent from "./components/CookieConsent";
import MobileReserveCTA from "./components/MobileReserveCTA";
import FloatingActions from "./components/FloatingActions";
import ScrollToTop from "./components/ScrollToTop";
import PageTransition from "./components/PageTransition";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";

// Sin esto, React Query usa sus valores por defecto: `staleTime: 0` (cada
// montaje de un componente con `useQuery` — novedades, reseñas, menús del
// día — vuelve a pedir los datos a Supabase, aunque acaben de llegar) y
// `refetchOnWindowFocus: true` (repite la petición cada vez que el móvil
// vuelve de segundo plano). Para contenido que cambia como mucho una vez al
// día, eso es red y parpadeo de "cargando" de más en cada vuelta a la
// página. 5 minutos de margen antes de refrescar en segundo plano.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Dos librerías de toasts distintas (Radix `Toaster` para carta/contacto,
// `Sonner` solo para reservas), ninguna pinta nada hasta que algo llama a
// `toast(...)`. Antes se importaban de forma estática y entraban en el
// bundle de arranque de CADA página, aunque esa página nunca fuera a lanzar
// un toast. Perezosas, así ese peso no cuenta para la primera carga.
const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
    Cargando...
  </div>
);

// Layout raíz: aporta todos los providers alrededor del <Outlet />.
// vite-react-ssg construye el router internamente a partir del array `routes`.
//
// `key={lang}` en `LanguageProvider` NO es decorativo. Las tres ramas ("/",
// "/en", "/fr") renderizan el MISMO componente `Layout` — React las ve como
// "el mismo elemento en la misma posición" al navegar de una rama a otra
// (mismo tipo de componente, aunque sean rutas de nivel superior distintas),
// así que por defecto ACTUALIZA la instancia existente en vez de
// desmontarla. Sin `key`, el `useState(() => initialLanguage ?? …)` de
// `LanguageProvider` no vuelve a evaluar su inicializador — solo se ejecuta
// en el montaje real — y el idioma se queda congelado en el de la PRIMERA
// rama visitada: la URL cambiaba a `/fr/...` pero la página seguía en
// inglés (comprobado con el selector del header, sin ningún error en
// consola: el fallo era silencioso). `key={lang}` obliga a React a tratar
// el cambio de idioma como un componente nuevo y remontarlo limpio.
const Layout = ({ lang }: { lang: Language }) => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider key={lang} initialLanguage={lang}>
      <TooltipProvider>
        <ScrollToTop />
        <Suspense fallback={null}>
          <Toaster />
          <Sonner />
        </Suspense>
        <CookieConsent />
        <SectionErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <PageTransition />
          </Suspense>
        </SectionErrorBoundary>
        <MobileReserveCTA />
        {/* "Pregunta a Tomy" + ticket del pedido, en todas las páginas (antes el
            ticket solo existía dentro de `CartaSection`, en la portada). */}
        <FloatingActions />
      </TooltipProvider>
    </LanguageProvider>
    {/* Vercel Web Analytics (sin cookies). Renderiza `null` y solo inyecta el
        script en un useEffect → no afecta al HTML del SSG. El script sigue los
        cambios de history (react-router), así que cada navegación en cliente
        cuenta como page view. Las tres ramas (/, /en, /fr) montan su propio
        Layout; `inject()` es idempotente (no duplica el <script>). */}
    <Analytics />
  </QueryClientProvider>
);

// Adapta el `export default` de cada página al contrato `lazy` de react-router
// (que devuelve `{ Component }`). vite-react-ssg espera (await) este `lazy`
// antes de renderizar, por lo que el HTML del SSG contiene el contenido real
// (a diferencia de React.lazy + Suspense, que renderizaría el fallback vacío).
const lazyRoute =
  (factory: () => Promise<{ default: ComponentType }>) =>
  async () => ({ Component: (await factory()).default });

/**
 * Páginas de la carta para UN idioma: mismos componentes de página en las
 * tres ramas (`/`, `/en`, `/fr`), montados bajo el prefijo de cada una — el
 * componente es el mismo módulo, lo único que cambia es qué `getStaticPaths`
 * le pasa (`rutasDeCategorias(lang)`, con el prefijo ya puesto).
 *
 * `vinos` y `bebidas` van como segmentos literales: react-router puntúa los
 * estáticos por encima de los dinámicos, así que `carta/vinos` nunca cae en
 * `:categoria` aunque alguien cree una categoría con ese nombre (a la que
 * `carta-rutas.ts` le daría el slug `vinos-2`).
 */
const cartaChildren = (lang: Language): RouteRecord[] => [
  { index: true, lazy: lazyRoute(() => import("./pages/Index")) },
  { path: "carta", lazy: lazyRoute(() => import("./pages/carta/Indice")) },
  { path: "carta/vinos", lazy: lazyRoute(() => import("./pages/carta/Vinos")) },
  { path: "carta/bebidas", lazy: lazyRoute(() => import("./pages/carta/Bebidas")) },
  {
    path: "carta/:categoria",
    lazy: lazyRoute(() => import("./pages/carta/Categoria")),
    /**
     * Una ruta con `:` la descarta el recolector de vite-react-ssg
     * (`DefaultIncludedRoutes`), igual que pasaba con `404`. `getStaticPaths`
     * enumera las URLs reales — y las saca de los datos que el build acaba
     * de descargar de Supabase, NO de una lista escrita a mano: si el dueño
     * añade una categoría desde el panel, el siguiente build la publica en
     * los tres idiomas.
     *
     * Debe devolver la ruta YA con el prefijo del idioma (`rutaCategoria`
     * se encarga): el colector de vite-react-ssg usa tal cual cualquier ruta
     * que empiece por "/", sin anteponerle el prefijo de esta rama.
     *
     * El `import()` es dinámico para que el índice de categorías no entre
     * en el chunk de arranque: esta función solo la ejecuta Node al
     * prerenderizar, nunca el navegador.
     */
    getStaticPaths: async () => (await import("./lib/carta-rutas")).rutasDeCategorias(lang),
  },
];

// Ruta compartida por las tres ramas: sin ella, un enlace roto a
// `/en/lo-que-sea` se quedaría sin coincidir en vez de caer en NotFound.
// FÁBRICA, no un objeto compartido: react-router asigna a cada ruta un id
// interno derivado de su posición en el árbol, y reutilizar el MISMO objeto
// en las tres ramas causaba "Found a route id collision on id ..." en el
// router del cliente (visto en consola al navegar) — aunque las tres
// llamadas a `lazy` sean idempotentes, la identidad del objeto no lo es.
const buildCatchAllRoute = (): RouteRecord => ({
  path: "*",
  lazy: lazyRoute(() => import("./pages/NotFound")),
});

export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <Layout lang="es" />,
    children: [
      ...cartaChildren("es"),
      // Reservas y la política de privacidad se quedan solo en español por
      // ahora (ver informe final): el formulario de reservas no forma parte
      // del problema de indexación que motiva este cambio (no lo lee
      // Google) y la política es contenido legal `noindex`, sin traducción
      // en la base de datos. Nada les impide sumarse más adelante — solo
      // haría falta añadirlas a `cartaChildren` y escribirles título/
      // descripción por idioma, igual que aquí.
      { path: "reservas", lazy: lazyRoute(() => import("./pages/Reservas")) },
      {
        path: "politica-privacidad",
        lazy: lazyRoute(() => import("./pages/PoliticaPrivacidad")),
      },
      // Páginas de los enlaces de los correos (Supabase sirve el HTML de sus
      // funciones como text/plain, así que las sirve la web). `noindex`, solo
      // en español como los correos, y el SSG prerenderiza un cascarón vacío:
      // el token/firma se lee en el navegador, nunca en el build.
      { path: "reserva/respuesta", lazy: lazyRoute(() => import("./pages/RespuestaReserva")) },
      { path: "newsletter/baja", lazy: lazyRoute(() => import("./pages/NewsletterBaja")) },
      // Ruta literal para que el SSG prerenderice `404.html` (vite-react-ssg
      // descarta la ruta "*" al recolectar paths). Vercel sirve ese fichero con
      // status 404 para cualquier URL que no resuelva en el filesystem. Uno
      // solo para todo el sitio: Vercel no elige el 404 por idioma.
      { path: "404", lazy: lazyRoute(() => import("./pages/NotFound")) },
      // ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE
      buildCatchAllRoute(),
    ],
  },
  { path: "/en", element: <Layout lang="en" />, children: [...cartaChildren("en"), buildCatchAllRoute()] },
  { path: "/fr", element: <Layout lang="fr" />, children: [...cartaChildren("fr"), buildCatchAllRoute()] },
];
