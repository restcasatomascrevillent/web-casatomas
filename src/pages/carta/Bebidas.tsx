import { Link, Navigate } from "react-router-dom";
import datos from "virtual:carta-ssg/bebidas";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import CartaBebidas, { CATEGORIA_INICIAL } from "@/components/carta/CartaBebidas";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";
import { useMostrarCartaBebidas } from "@/hooks/useMostrarCartaBebidas";

const RUTA_ES = "/carta/bebidas";

const TEXTOS: Record<
  Language,
  {
    title: string;
    description: (n: number) => string;
    keywords: string[];
    migaCarta: string;
    miga: string;
    titulo: string;
    detalle: (n: number) => string;
    vacia: string;
    tambien: string;
    verVinos: string;
  }
> = {
  es: {
    title: "Bebidas y refrescos: precios | Casa Tomás Crevillent",
    description: (n) => `Aguas, refrescos, cervezas y tónicas en Casa Tomás (Crevillent, Alicante): ${n} referencias con su precio.`,
    keywords: ["bebidas Casa Tomás", "refrescos Crevillent", "cervezas restaurante Alicante"],
    migaCarta: "Carta",
    miga: "Bebidas",
    titulo: "Bebidas",
    detalle: (n) => `${n} referencias`,
    vacia: "Las bebidas no están disponibles ahora mismo.",
    tambien: "También puedes consultar la",
    verVinos: "carta de vinos",
  },
  en: {
    title: "Drinks & Soft Drinks: Prices | Casa Tomás Crevillent",
    description: (n) => `Water, soft drinks, beers and tonics at Casa Tomás (Crevillent, Alicante): ${n} items with their price.`,
    keywords: ["Casa Tomás drinks", "soft drinks Crevillent", "restaurant beers Alicante"],
    migaCarta: "Menu",
    miga: "Drinks",
    titulo: "Drinks",
    detalle: (n) => `${n} items`,
    vacia: "Drinks aren't available right now.",
    tambien: "You can also check our",
    verVinos: "wine list",
  },
  fr: {
    title: "Boissons et rafraîchissements : prix | Casa Tomás Crevillent",
    description: (n) => `Eaux, boissons gazeuses, bières et toniques chez Casa Tomás (Crevillent, Alicante) : ${n} références avec leur prix.`,
    keywords: ["boissons Casa Tomás", "boissons gazeuses Crevillent", "bières restaurant Alicante"],
    migaCarta: "Carte",
    miga: "Boissons",
    titulo: "Boissons",
    detalle: (n) => `${n} références`,
    vacia: "Les boissons ne sont pas disponibles pour le moment.",
    tambien: "Vous pouvez aussi consulter la",
    verVinos: "carte des vins",
  },
};

/**
 * `/carta/bebidas` — refrescos, aguas, cervezas y tónicas, con buscador,
 * filtro por categoría y "añadir a Mi mesa" (mismo `CartaBebidas` que antes
 * solo se abría desde la portada, igual que ya pasó con `CartaVinos`).
 *
 * SEMILLA DEL BUILD. `CartaBebidas` recibe `initialBebidas` (de
 * `virtual:carta-ssg/bebidas`, lo mismo que usa el JSON-LD de abajo) para que
 * las bebidas ya estén en el HTML del SSG — sin esto, la cuadrícula nacería
 * vacía a la espera de la respuesta de Supabase.
 */
const CartaBebidasPagina = () => {
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  const url = `${SITE_URL}${construirRutaIdioma(RUTA_ES, language)}`;
  const bebidas = datos.bebidas ?? [];
  const secciones = agruparPorCategoria(bebidas, language);
  // El desplegable arranca en `CATEGORIA_INICIAL` ("Aguas"): sin esta
  // segunda clave, esa categoría nacería sin semilla y mostraría el estado
  // de carga en vez de las bebidas ya traídas en el build.
  const bebidasCategoriaInicial =
    CATEGORIA_INICIAL === "TODAS"
      ? bebidas
      : bebidas.filter((bebida) => bebida.categoria === CATEGORIA_INICIAL);

  // Carta de Bebidas apagada en el panel (11/11/2026, por defecto): la página no sale y lleva a la
  // carta. El HTML del build lleva `noindex` (así tampoco entra en el sitemap) y, en el navegador,
  // `Navigate` manda a `/carta` en el idioma de la página.
  const mostrarCartaBebidas = useMostrarCartaBebidas();
  if (!mostrarCartaBebidas) {
    return (
      <>
        <Seo title={textos.title} description={textos.description(bebidas.length)} canonical={url} lang={language} noindex />
        <Navigate to={construirRutaIdioma("/carta", language)} replace />
      </>
    );
  }

  return (
    <>
      <Seo
        title={textos.title}
        description={textos.description(bebidas.length)}
        canonical={url}
        lang={language}
        languageAlternates={alternatesDePagina(RUTA_ES, SITE_URL)}
        keywords={textos.keywords}
      />
      <JsonLd
        data={breadcrumbSchema(
          [
            { nombre: textos.migaCarta, path: "/carta" },
            { nombre: textos.miga, path: RUTA_ES },
          ],
          language,
        )}
      />
      {secciones.length > 0 && (
        <JsonLd
          data={menuPagina(
            menuSchema(secciones, language, undefined, {
              id: `${url}#menu`,
              nombre: `${textos.titulo} — Casa Tomás`,
              url,
            }),
          )}
        />
      )}

      <CartaPageLayout
        titulo={textos.titulo}
        detalle={textos.detalle(bebidas.length)}
        migas={[{ nombre: textos.migaCarta, path: "/carta" }, { nombre: textos.miga }]}
      >
        {bebidas.length > 0 ? (
          <CartaBebidas
            showAddButton
            initialBebidas={{ TODAS: bebidas, [CATEGORIA_INICIAL]: bebidasCategoriaInicial }}
          />
        ) : (
          <p className="text-muted-foreground">{textos.vacia}</p>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          {textos.tambien}{" "}
          <Link to={construirRutaIdioma("/carta/vinos", language)} className="text-accent underline underline-offset-2 hover:decoration-2">
            {textos.verVinos}
          </Link>
          .
        </p>
      </CartaPageLayout>
    </>
  );
};

export default CartaBebidasPagina;
