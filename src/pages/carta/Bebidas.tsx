import { Link } from "react-router-dom";
import datos from "virtual:carta-ssg/bebidas";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import ListaPrecios, { type FilaPrecio } from "@/components/carta/ListaPrecios";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { etiquetaCategoria, slugificar } from "@/lib/carta-rutas";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";
import type { ItemTraducido } from "@/lib/carta-i18n";
import type { BebidaSSG } from "@/lib/carta-ssg-types";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";

const RUTA_ES = "/carta/bebidas";

// El tamaño ("33 cl") no lleva traducción propia — es una medida, no prosa —
// así que se deja igual; la descripción sí usa `displayDescripcion`.
const aFila = (bebida: ItemTraducido<BebidaSSG>, indice: number): FilaPrecio => ({
  id: bebida.id ?? `${bebida.nombre}-${indice}`,
  nombre: bebida.displayNombre,
  // `tamano` y `descripcion` están vacíos en casi todas las filas; si no hay
  // dato no se pinta la línea secundaria en vez de inventarse una.
  detalle: bebida.tamano || bebida.displayDescripcion || undefined,
  precio: bebida.precio_eur,
});

const TEXTOS: Record<
  Language,
  {
    title: string;
    description: (n: number) => string;
    keywords: string[];
    miga: string;
    titulo: string;
    subtitulo: string;
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
    miga: "Bebidas",
    titulo: "Bebidas",
    subtitulo: "Aguas, refrescos, tónicas y cervezas, con el precio de cada una.",
    detalle: (n) => `${n} referencias`,
    vacia: "Las bebidas no están disponibles ahora mismo.",
    tambien: "También puedes consultar la",
    verVinos: "carta de vinos",
  },
  en: {
    title: "Drinks & Soft Drinks: Prices | Casa Tomás Crevillent",
    description: (n) => `Water, soft drinks, beers and tonics at Casa Tomás (Crevillent, Alicante): ${n} items with their price.`,
    keywords: ["Casa Tomás drinks", "soft drinks Crevillent", "restaurant beers Alicante"],
    miga: "Drinks",
    titulo: "Drinks",
    subtitulo: "Water, soft drinks, tonics and beers, with the price of each one.",
    detalle: (n) => `${n} items`,
    vacia: "Drinks aren't available right now.",
    tambien: "You can also check our",
    verVinos: "wine list",
  },
  fr: {
    title: "Boissons et rafraîchissements : prix | Casa Tomás Crevillent",
    description: (n) => `Eaux, boissons gazeuses, bières et toniques chez Casa Tomás (Crevillent, Alicante) : ${n} références avec leur prix.`,
    keywords: ["boissons Casa Tomás", "boissons gazeuses Crevillent", "bières restaurant Alicante"],
    miga: "Boissons",
    titulo: "Boissons",
    subtitulo: "Eaux, boissons gazeuses, toniques et bières, avec le prix de chacune.",
    detalle: (n) => `${n} références`,
    vacia: "Les boissons ne sont pas disponibles pour le moment.",
    tambien: "Vous pouvez aussi consulter la",
    verVinos: "carte des vins",
  },
};

/** `/carta/bebidas` — refrescos, aguas, cervezas y tónicas con su precio. */
const CartaBebidasPagina = () => {
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  const url = `${SITE_URL}${construirRutaIdioma(RUTA_ES, language)}`;
  const bebidas = datos.bebidas ?? [];
  const secciones = agruparPorCategoria(bebidas, language);

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
      <JsonLd data={breadcrumbSchema([{ nombre: textos.miga, path: RUTA_ES }], language)} />
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
        subtitulo={textos.subtitulo}
        detalle={textos.detalle(bebidas.length)}
        migas={[{ nombre: textos.miga }]}
      >
        {secciones.length > 0 ? (
          <div className="space-y-12">
            {secciones.map((seccion) => (
              <section
                key={seccion.clave}
                id={slugificar(seccion.clave) || undefined}
                aria-labelledby={`bebidas-${slugificar(seccion.clave)}`}
                className="animate-fade-up"
              >
                <div className="flex items-baseline justify-between gap-4 mb-4">
                  <h2
                    id={`bebidas-${slugificar(seccion.clave)}`}
                    className="text-2xl md:text-3xl font-bold text-primary"
                  >
                    {etiquetaCategoria(seccion.nombre)}
                  </h2>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {seccion.items.length}
                  </span>
                </div>
                <ListaPrecios filas={seccion.items.map(aFila)} />
              </section>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{textos.vacia}</p>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          {textos.tambien}{" "}
          <Link to={construirRutaIdioma("/carta/vinos", language)} className="text-accent hover:underline">
            {textos.verVinos}
          </Link>
          .
        </p>
      </CartaPageLayout>
    </>
  );
};

export default CartaBebidasPagina;
