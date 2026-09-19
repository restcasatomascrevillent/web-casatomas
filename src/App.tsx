import { Suspense, type ComponentType } from "react";
import { Outlet } from "react-router-dom";
import type { RouteRecord } from "vite-react-ssg";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CookieConsent from "./components/CookieConsent";
import MobileReserveCTA from "./components/MobileReserveCTA";
import { LanguageProvider } from "@/i18n/LanguageProvider";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
    Cargando...
  </div>
);

// Layout raíz: aporta todos los providers alrededor del <Outlet />.
// vite-react-ssg construye el router internamente a partir del array `routes`.
const Layout = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CookieConsent />
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
        <MobileReserveCTA />
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

// Adapta el `export default` de cada página al contrato `lazy` de react-router
// (que devuelve `{ Component }`). vite-react-ssg espera (await) este `lazy`
// antes de renderizar, por lo que el HTML del SSG contiene el contenido real
// (a diferencia de React.lazy + Suspense, que renderizaría el fallback vacío).
const lazyRoute =
  (factory: () => Promise<{ default: ComponentType }>) =>
  async () => ({ Component: (await factory()).default });

export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, lazy: lazyRoute(() => import("./pages/Index")) },
      { path: "reservas", lazy: lazyRoute(() => import("./pages/Reservas")) },
      { path: "carta", lazy: lazyRoute(() => import("./pages/carta/Indice")) },
      // `vinos` y `bebidas` van como segmentos literales: react-router puntúa
      // los estáticos por encima de los dinámicos, así que `/carta/vinos` nunca
      // cae en `:categoria` aunque alguien cree una categoría con ese nombre
      // (a la que `carta-rutas.ts` le daría el slug `vinos-2`).
      { path: "carta/vinos", lazy: lazyRoute(() => import("./pages/carta/Vinos")) },
      { path: "carta/bebidas", lazy: lazyRoute(() => import("./pages/carta/Bebidas")) },
      {
        path: "carta/:categoria",
        lazy: lazyRoute(() => import("./pages/carta/Categoria")),
        /**
         * Una ruta con `:` la descarta el recolector de vite-react-ssg
         * (`DefaultIncludedRoutes`), igual que pasaba con `*`. `getStaticPaths`
         * enumera las URLs reales — y las saca de los datos que el build acaba
         * de descargar de Supabase, NO de una lista escrita a mano: si el dueño
         * añade una categoría desde el panel, el siguiente build la publica.
         *
         * El `import()` es dinámico para que el índice de categorías no entre
         * en el chunk de arranque: esta función solo la ejecuta Node al
         * prerenderizar, nunca el navegador.
         */
        getStaticPaths: async () => (await import("./lib/carta-rutas")).rutasDeCategorias(),
      },
      {
        path: "politica-privacidad",
        lazy: lazyRoute(() => import("./pages/PoliticaPrivacidad")),
      },
      { path: "touza-cocktail", lazy: lazyRoute(() => import("./pages/NotFound")) },
      // Ruta literal para que el SSG prerenderice `404.html` (vite-react-ssg
      // descarta la ruta "*" al recolectar paths). Vercel sirve ese fichero con
      // status 404 para cualquier URL que no resuelva en el filesystem.
      { path: "404", lazy: lazyRoute(() => import("./pages/NotFound")) },
      // ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE
      { path: "*", lazy: lazyRoute(() => import("./pages/NotFound")) },
    ],
  },
];
