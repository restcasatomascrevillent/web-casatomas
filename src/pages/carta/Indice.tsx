import { Link } from "react-router-dom";
import { Beer, UtensilsCrossed, Wine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import {
  CATEGORIAS_CARTA,
  etiquetaCategoria,
  RESUMEN_BEBIDAS,
  RESUMEN_VINOS,
  rutaCategoria,
  TOTAL_CARTA,
  TOTAL_PLATOS,
} from "@/lib/carta-rutas";
import { breadcrumbSchema, menuIndiceSchema, SITE_URL } from "@/lib/negocio";

const plural = (n: number, singular: string, plural_: string) =>
  `${n} ${n === 1 ? singular : plural_}`;

/**
 * Tarjeta-enlace de una sección de la carta.
 * Mismo `Card` y mismo `hover:-translate-y-1` que las tarjetas de plato.
 */
const TarjetaSeccion = ({
  to,
  titulo,
  detalle,
  icono,
}: {
  to: string;
  titulo: string;
  detalle: string;
  icono: React.ReactNode;
}) => (
  <Link to={to} className="group focus-visible:outline-none">
    <Card className="font-libre-baskerville h-full p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-accent">
      <span className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 text-accent">
        {icono}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold text-primary group-hover:text-accent transition-colors break-words">
          {titulo}
        </span>
        <span className="block text-sm text-muted-foreground mt-0.5">{detalle}</span>
      </span>
    </Card>
  </Link>
);

/**
 * `/carta` — índice de la carta.
 *
 * No repite productos: reparte enlaces hacia las páginas que sí los tienen. Su
 * JSON-LD es un `Menu` de secciones con recuento y URL, sin `MenuItem`.
 */
const CartaIndice = () => {
  const secciones = [
    ...CATEGORIAS_CARTA.map((categoria) => ({
      nombre: etiquetaCategoria(categoria.clave),
      total: categoria.total,
      url: `${SITE_URL}${rutaCategoria(categoria.slug)}`,
    })),
    { nombre: "Vinos", total: RESUMEN_VINOS.total, url: `${SITE_URL}/carta/vinos` },
    { nombre: "Bebidas", total: RESUMEN_BEBIDAS.total, url: `${SITE_URL}/carta/bebidas` },
  ];

  return (
    <>
      <Seo
        title="Carta y precios | Casa Tomás Restaurante en Crevillent"
        description={`Carta completa de Casa Tomás (Crevillent, Alicante): ${TOTAL_PLATOS} platos con precios y alérgenos, ${RESUMEN_VINOS.total} vinos y ${RESUMEN_BEBIDAS.total} bebidas. Arroces, mariscos, pescados y carnes.`}
        canonical={`${SITE_URL}/carta`}
        keywords={[
          "carta Casa Tomás",
          "menú restaurante Crevillent",
          "precios restaurante Crevillent",
          "carta de vinos Crevillent",
        ]}
      />
      <JsonLd data={breadcrumbSchema([{ nombre: "Carta", path: "/carta" }])} />
      <JsonLd data={menuIndiceSchema(secciones, "es")} />

      <CartaPageLayout
        titulo="Nuestra carta"
        subtitulo="Cocina tradicional alicantina en Crevillent. Todos los precios y los alérgenos de cada plato, actualizados desde la carta del restaurante."
        detalle={`${TOTAL_CARTA} referencias en total`}
        migas={[{ nombre: "Carta" }]}
        volverA={{ texto: "Volver a la portada", path: "/" }}
      >
        <section aria-labelledby="platos" className="animate-fade-up">
          <h2 id="platos" className="text-2xl md:text-3xl font-bold text-primary mb-2">
            Platos
          </h2>
          <p className="text-muted-foreground mb-6">
            {plural(TOTAL_PLATOS, "plato", "platos")} en{" "}
            {plural(CATEGORIAS_CARTA.length, "categoría", "categorías")}.
          </p>

          {CATEGORIAS_CARTA.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {CATEGORIAS_CARTA.map((categoria) => (
                <TarjetaSeccion
                  key={categoria.slug}
                  to={rutaCategoria(categoria.slug)}
                  titulo={etiquetaCategoria(categoria.clave)}
                  detalle={plural(categoria.total, "plato", "platos")}
                  icono={<UtensilsCrossed className="w-6 h-6" />}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              La carta de platos no está disponible en este momento.
            </p>
          )}
        </section>

        <section aria-labelledby="bodega" className="mt-14 animate-fade-up">
          <h2 id="bodega" className="text-2xl md:text-3xl font-bold text-primary mb-6">
            Bodega y bebidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <TarjetaSeccion
              to="/carta/vinos"
              titulo="Carta de vinos"
              detalle={plural(RESUMEN_VINOS.total, "referencia", "referencias")}
              icono={<Wine className="w-6 h-6" />}
            />
            <TarjetaSeccion
              to="/carta/bebidas"
              titulo="Bebidas"
              detalle={plural(RESUMEN_BEBIDAS.total, "referencia", "referencias")}
              icono={<Beer className="w-6 h-6" />}
            />
          </div>
        </section>
      </CartaPageLayout>
    </>
  );
};

export default CartaIndice;
