import { useFiltrosCarta } from "@/hooks/useFiltrosCarta";
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImagenResponsive from "@/components/ImagenResponsive";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";

const INICIO_POR_IDIOMA = { es: "Inicio", en: "Home", fr: "Accueil" } as const;

export interface Miga {
  nombre: string;
  /** Ausente en la última miga: esa es la página actual. */
  path?: string;
}

interface CartaPageLayoutProps {
  titulo: string;
  subtitulo?: string;
  /** Línea corta bajo el subtítulo (p. ej. "17 platos"). */
  detalle?: string;
  migas: Miga[];
  /** Enlace de vuelta al pie. `null` en la propia `/carta`, que ya es el índice. */
  volverA?: { texto: string; path: string } | null;
  children: ReactNode;
}

/**
 * Marco común de las páginas de carta (`/carta`, `/carta/:categoria`,
 * `/carta/vinos`, `/carta/bebidas`).
 *
 * Reutiliza tal cual el `Header` y el `Footer` de la portada y la banda oscura
 * (`bg-dark-slate`) que ya usa `PoliticaPrivacidad`, para que estas páginas se
 * lean como parte de la misma web y no como un anexo.
 *
 * Sin `motion` ni `whileInView` en el contenido: framer-motion serializa
 * `style="opacity:0"` en el HTML del SSG y aquí lo que se prerenderiza son los
 * productos. Las animaciones de entrada salen de las utilidades CSS del propio
 * repo (`animate-fade-up`, definida en `tailwind.config.ts`), cuyo estado final
 * —y el estado sin CSS— es visible.
 */
const VOLVER_A_LA_CARTA = {
  es: "Volver a la carta",
  en: "Back to the menu",
  fr: "Retour à la carte",
} as const;

const CartaPageLayout = ({
  titulo,
  subtitulo,
  detalle,
  migas,
  volverA,
  children,
}: CartaPageLayoutProps) => {
  const { language } = useTranslations();
  const { conFiltros } = useFiltrosCarta();
  // Cada página pasa sus `migas`/`volverA` "en español" (rutas sin prefijo,
  // textos ya en su idioma); aquí se prefija cada URL una sola vez, para que
  // ninguna página tenga que repetir `construirRutaIdioma`.
  const volverAResuelto =
    volverA === undefined ? { texto: VOLVER_A_LA_CARTA[language], path: "/carta" } : volverA;
  const anteriores = migas.slice(0, -1);
  const actual = migas[migas.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Mismo degradado de base que la sección de carta de la portada
          (`CartaSection`), con la foto de la lámpara difuminada detrás. La
          banda oscura de `PoliticaPrivacidad` no sirve aquí: esa página no
          monta el `Header`, y los enlaces del menú son `text-foreground/80`
          — sobre `bg-dark-slate` quedaban invisibles (contraste 1:1,
          comprobado en el navegador).
          `pt-24` deja hueco a la cabecera fija (h-16 en móvil, h-20 en md). */}
      <div className="relative overflow-hidden bg-muted pt-24 md:pt-28 pb-10 px-4 md:px-8 lg:px-16">
        {/* La foto solo ocupa un panel pegado a la izquierda a partir de
            `md` (con su propio degradado hacia `bg-muted` en el borde
            derecho): a todo lo ancho de la banda, la lámpara —centrada en
            la foto original— saldría en mitad de la banda, no "a la
            izquierda". En móvil sí ocupa toda la anchura: no hay sitio para
            un panel más pequeño y un recorte a toda anchura ya se ve bien. */}
        <div className="absolute inset-y-0 left-0 w-full md:w-[300px] lg:w-[420px] xl:w-[560px] overflow-hidden">
          <ImagenResponsive
            nombre="lampara"
            alt=""
            aria-hidden="true"
            decoding="async"
            sizes="(min-width: 1280px) 560px, (min-width: 1024px) 420px, (min-width: 768px) 300px, 100vw"
            className="absolute inset-0 w-full h-full object-cover object-[50%_30%]"
          />
          <div className="hidden md:block absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-transparent to-muted" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-muted/95" />
        <div className="relative max-w-7xl mx-auto animate-fade-up">
          <Breadcrumb className="mb-5">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="hover:text-accent">
                  <Link to={conFiltros(construirRutaIdioma("/", language))}>{INICIO_POR_IDIOMA[language]}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {/* Los separadores van como hermanos, ver nota más abajo. */}
              {/* `BreadcrumbSeparator` ya es un `<li role="presentation">`, así
                  que va COMO HERMANO de `BreadcrumbItem`, nunca dentro: un
                  `<li>` anidado en otro `<li>` es HTML inválido y el navegador
                  lo reubica al parsear, lo que rompía la hidratación. */}
              {anteriores.map((miga) => (
                <Fragment key={miga.path ?? miga.nombre}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild className="hover:text-accent">
                      <Link to={conFiltros(construirRutaIdioma(miga.path ?? "/", language))}>{miga.nombre}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </Fragment>
              ))}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{actual.nombre}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Mismas clases que los `h2` de sección de la portada. */}
          <h1 className="font-libre-baskerville text-3xl md:text-5xl font-bold text-primary">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-muted-foreground mt-3 max-w-2xl text-base md:text-lg">{subtitulo}</p>
          )}
          {detalle && <p className="text-accent mt-2 text-sm font-semibold">{detalle}</p>}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-12 md:py-16">{children}</main>

      {volverAResuelto && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 pb-12">
          <Link
            to={conFiltros(construirRutaIdioma(volverAResuelto.path, language))}
            className="inline-flex items-center gap-2 text-accent hover:underline text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            {volverAResuelto.texto}
          </Link>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CartaPageLayout;
