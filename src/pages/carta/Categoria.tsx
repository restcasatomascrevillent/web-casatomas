import { Link, useParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import ProductoCard from "@/components/carta/ProductoCard";
import {
  CATEGORIAS_CARTA,
  categoriaPorSlug,
  etiquetaCategoria,
  platosDeCategoria,
  rutaCategoria,
} from "@/lib/carta-rutas";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/**
 * `/carta/:categoria` — una página por categoría con TODOS sus platos visibles.
 *
 * Las rutas concretas las enumera `getStaticPaths` en `App.tsx` a partir de
 * `CATEGORIAS_CARTA`, que sale de los datos del build. Un slug que no existe no
 * genera `.html`, así que Vercel responde con el `404.html` real; este
 * componente solo ve ese caso si alguien navega a él dentro de la SPA.
 */
const CartaCategoria = () => {
  const { categoria: slug } = useParams<{ categoria: string }>();
  const categoria = categoriaPorSlug(slug);

  if (!categoria) {
    return (
      <>
        <Seo title="Categoría no encontrada | Casa Tomás Restaurante" noindex />
        <CartaPageLayout
          titulo="Categoría no encontrada"
          subtitulo="Puede que esa parte de la carta haya cambiado de nombre o ya no esté disponible."
          migas={[{ nombre: "Carta", path: "/carta" }, { nombre: "No encontrada" }]}
        >
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIAS_CARTA.map((otra) => (
              <li key={otra.slug}>
                <Link to={rutaCategoria(otra.slug)} className="text-accent hover:underline">
                  {etiquetaCategoria(otra.clave)}
                </Link>
              </li>
            ))}
          </ul>
        </CartaPageLayout>
      </>
    );
  }

  const platos = platosDeCategoria(categoria.clave);
  const etiqueta = etiquetaCategoria(categoria.clave);
  const url = `${SITE_URL}${rutaCategoria(categoria.slug)}`;
  const conFoto = platos.filter((plato) => plato.imagen_url).length;

  // `agruparPorCategoria` con idioma fijo "es": esta pasada es monolingüe y así
  // el JSON-LD del build y el del navegador son byte a byte el mismo.
  const secciones = agruparPorCategoria(platos, "es");

  return (
    <>
      <Seo
        title={`${etiqueta}: carta y precios | Casa Tomás Crevillent`}
        description={`${platos.length} ${
          platos.length === 1 ? "plato" : "platos"
        } de la sección ${etiqueta.toLowerCase()} en Casa Tomás (Crevillent, Alicante), con precio y alérgenos de cada uno.`}
        canonical={url}
        keywords={[
          `${etiqueta.toLowerCase()} Crevillent`,
          `${etiqueta.toLowerCase()} restaurante Alicante`,
          "carta Casa Tomás",
        ]}
      />
      <JsonLd
        data={breadcrumbSchema([
          { nombre: "Carta", path: "/carta" },
          { nombre: etiqueta, path: rutaCategoria(categoria.slug) },
        ])}
      />
      {secciones.length > 0 && (
        <JsonLd
          data={menuPagina(
            menuSchema(secciones, "es", SUPABASE_URL, {
              id: `${url}#menu`,
              nombre: `${etiqueta} — Casa Tomás`,
              url,
            }),
          )}
        />
      )}

      <CartaPageLayout
        titulo={etiqueta}
        subtitulo={`Carta de Casa Tomás en Crevillent (Alicante). Precios y alérgenos de cada plato${
          conFoto > 0 ? `, con foto en ${conFoto} de ellos` : ""
        }.`}
        detalle={`${platos.length} ${platos.length === 1 ? "plato" : "platos"}`}
        migas={[{ nombre: "Carta", path: "/carta" }, { nombre: etiqueta }]}
      >
        {platos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-6 md:gap-8 animate-fade-up">
            {platos.map((plato, indice) => (
              <ProductoCard
                key={plato.id ?? `${plato.nombre}-${indice}`}
                plato={plato}
                categoria={etiqueta}
                prioridad={indice < 3}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Esta sección de la carta está vacía ahora mismo.
          </p>
        )}

        <nav aria-label="Otras secciones de la carta" className="mt-14">
          <h2 className="text-xl font-bold text-primary mb-4">Otras secciones</h2>
          <ul className="flex flex-wrap gap-2">
            {CATEGORIAS_CARTA.filter((otra) => otra.slug !== categoria.slug).map((otra) => (
              <li key={otra.slug}>
                <Link
                  to={rutaCategoria(otra.slug)}
                  className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
                >
                  {etiquetaCategoria(otra.clave)}
                  <span className="ml-2 text-xs text-accent font-semibold">{otra.total}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/carta/vinos"
                className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
              >
                Vinos
              </Link>
            </li>
            <li>
              <Link
                to="/carta/bebidas"
                className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-accent/40 hover:text-foreground"
              >
                Bebidas
              </Link>
            </li>
          </ul>
        </nav>
      </CartaPageLayout>
    </>
  );
};

export default CartaCategoria;
