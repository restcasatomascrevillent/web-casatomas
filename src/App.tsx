import { lazy, Suspense, type ComponentType } from "react";
import type { RouteRecord } from "vite-react-ssg";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import CookieConsent from "./components/CookieConsent";
import SeguimientoActividad from "./components/SeguimientoActividad";
import MobileReserveCTA from "./components/MobileReserveCTA";
import FloatingActions from "./components/FloatingActions";
import ScrollToTop from "./components/ScrollToTop";
import SaltarAlContenido from "./components/SaltarAlContenido";
import PageTransition from "./components/PageTransition";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import ErrorDeRuta from "./components/ErrorDeRuta";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { HANDLE_PAGINA_NO_ENCONTRADA } from "@/lib/hidratacion-404";
import { importarConRecarga } from "@/lib/recarga-por-version";

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
const Toaster = lazy(importarConRecarga(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster }))));
const Sonner = lazy(importarConRecarga(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster }))));

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
        {/* Primer foco de todas las páginas (antes que el banner de cookies y
            la cabecera de cada página). */}
        <SaltarAlContenido />
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
    {/* Actividad y errores para Super Admin › Logs (src/lib/actividad): renderiza `null`, se instala
        cuando el navegador está ocioso y solo manda actividad con el consentimiento «Estadísticas». */}
    <SeguimientoActividad />
  </QueryClientProvider>
);

// Adapta el `export default` de cada página al contrato `lazy` de react-router
// (que devuelve `{ Component }`). vite-react-ssg espera (await) este `lazy`
// antes de renderizar, por lo que el HTML del SSG contiene el contenido real
// (a diferencia de React.lazy + Suspense, que renderizaría el fallback vacío).
const lazyRoute =
  (factory: () => Promise<{ default: ComponentType }>) =>
  async () => ({ Component: (await importarConRecarga(factory)()).default });

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

/**
 * Páginas que existen en las TRES ramas además de la portada y la carta:
 * el formulario de reserva (`reservas`), la política de privacidad, las
 * condiciones de reserva y de la newsletter, y la tienda de vinos. Las enlazan los botones
 * «Reservar», las casillas del formulario y el pie de página de cada idioma,
 * y cada una usa el idioma de su rama (`useTranslations`). Fábricas por la
 * misma razón que `buildCatchAllRoute` (un objeto por rama).
 */
const buildReservasRoute = (): RouteRecord => ({
  path: "reservas",
  lazy: lazyRoute(() => import("./pages/Reservas")),
});

const buildPoliticaPrivacidadRoute = (): RouteRecord => ({
  path: "politica-privacidad",
  lazy: lazyRoute(() => import("./pages/PoliticaPrivacidad")),
});

const buildCondicionesRoute = (): RouteRecord => ({
  path: "condiciones",
  lazy: lazyRoute(() => import("./pages/Condiciones")),
});

/**
 * Tienda de vinos (escaparate: precios de tienda de los vinos de la carta; se
 * compran en el restaurante, no por internet), en las tres ramas. Perezosa
 * como el resto: su chunk solo lo descarga quien la abre. Publicada en todos
 * los entornos, producción incluida: se prerenderiza y sale en el sitemap.
 */
const buildTiendaRoute = (): RouteRecord => ({
  path: "tienda",
  lazy: lazyRoute(() => import("./pages/Tienda")),
});

/** Las páginas multiidioma que no son de la carta, para una rama. */
const paginasComunes = (): RouteRecord[] => [
  buildReservasRoute(),
  buildPoliticaPrivacidadRoute(),
  buildCondicionesRoute(),
  buildTiendaRoute(),
  ...["el-restaurante", "contacto", "regala", "touza"].map(path => ({ path, lazy: lazyRoute(() => import("./pages/Informacion")) })),
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
  handle: HANDLE_PAGINA_NO_ENCONTRADA,
  lazy: lazyRoute(() => import("./pages/NotFound")),
});

/**
 * `errorElement` en cada ruta (y en el Layout de cada rama): si una página no
 * carga al navegar —lo normal: la pestaña tiene una versión antigua y su
 * fichero ya no existe—, `ErrorDeRuta` recarga o avisa en vez de la pantalla
 * de desarrollador de react-router («Unexpected Application Error!»).
 */
const conErrorDeRuta = (ruta: RouteRecord): RouteRecord => ({ ...ruta, errorElement: <ErrorDeRuta /> });

export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <Layout lang="es" />,
    errorElement: <ErrorDeRuta />,
    children: [
      ...cartaChildren("es"),
      // Reservas, política de privacidad y condiciones existen en las tres
      // ramas (`paginasComunes`). El selector de idioma las mantiene
      // (`existeEnTodosLosIdiomas` en `i18n/routing.ts`; un test compara esa
      // lista con este árbol, así que si una ruta cambia de rama, el test
      // avisa de que hay que actualizarla).
      ...paginasComunes(),
      // Páginas de los enlaces de los correos (Supabase sirve el HTML de sus
      // funciones como text/plain, así que las sirve la web). `noindex`, SOLO
      // en español a propósito: los correos están en español y enlazan a esta
      // versión; el selector de idioma manda desde aquí a la portada del otro
      // idioma. El SSG prerenderiza un cascarón vacío:
      // el token/firma se lee en el navegador, nunca en el build.
      { path: "reserva/respuesta", lazy: lazyRoute(() => import("./pages/RespuestaReserva")) },
      { path: "newsletter/baja", lazy: lazyRoute(() => import("./pages/NewsletterBaja")) },
      // Aviso legal (LSSI): solo en español, `noindex`. Lo enlaza el pie de
      // las tres ramas a esta misma URL (ver `AVISO_LEGAL_PATH`).
      { path: "aviso-legal", lazy: lazyRoute(() => import("./pages/AvisoLegal")) },
      // Ruta literal para que el SSG prerenderice `404.html` (vite-react-ssg
      // descarta la ruta "*" al recolectar paths). Vercel sirve ese fichero con
      // status 404 para cualquier URL que no resuelva en el filesystem. Uno
      // solo para todo el sitio: Vercel no elige el 404 por idioma.
      // Vercel la serviría con 200 en `/404` (`cleanUrls`): `middleware.ts` la
      // reescribe para que responda 404. `handle`: ver `src/lib/hidratacion-404.ts`.
      { path: "404", handle: HANDLE_PAGINA_NO_ENCONTRADA, lazy: lazyRoute(() => import("./pages/NotFound")) },
      // ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE
      buildCatchAllRoute(),
    ].map(conErrorDeRuta),
  },
  {
    path: "/en",
    element: <Layout lang="en" />,
    errorElement: <ErrorDeRuta />,
    children: [...cartaChildren("en"), ...paginasComunes(), buildCatchAllRoute()].map(conErrorDeRuta),
  },
  {
    path: "/fr",
    element: <Layout lang="fr" />,
    errorElement: <ErrorDeRuta />,
    children: [...cartaChildren("fr"), ...paginasComunes(), buildCatchAllRoute()].map(conErrorDeRuta),
  },
];
