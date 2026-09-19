import { Link } from "react-router-dom";
import datos from "virtual:carta-ssg/bebidas";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import ListaPrecios, { type FilaPrecio } from "@/components/carta/ListaPrecios";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { etiquetaCategoria, slugificar } from "@/lib/carta-rutas";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";
import type { BebidaSSG } from "@/lib/carta-ssg-types";

const URL_PAGINA = `${SITE_URL}/carta/bebidas`;

const aFila = (bebida: BebidaSSG, indice: number): FilaPrecio => ({
  id: bebida.id ?? `${bebida.nombre}-${indice}`,
  nombre: bebida.nombre,
  // `tamano` y `descripcion` están vacíos en casi todas las filas; si no hay
  // dato no se pinta la línea secundaria en vez de inventarse una.
  detalle: bebida.tamano || bebida.descripcion || undefined,
  precio: bebida.precio_eur,
});

/** `/carta/bebidas` — refrescos, aguas, cervezas y tónicas con su precio. */
const CartaBebidasPagina = () => {
  const bebidas = datos.bebidas ?? [];
  const secciones = agruparPorCategoria(bebidas, "es");

  return (
    <>
      <Seo
        title="Bebidas y refrescos: precios | Casa Tomás Crevillent"
        description={`Aguas, refrescos, cervezas y tónicas en Casa Tomás (Crevillent, Alicante): ${bebidas.length} referencias con su precio.`}
        canonical={URL_PAGINA}
        keywords={["bebidas Casa Tomás", "refrescos Crevillent", "cervezas restaurante Alicante"]}
      />
      <JsonLd
        data={breadcrumbSchema([
          { nombre: "Carta", path: "/carta" },
          { nombre: "Bebidas", path: "/carta/bebidas" },
        ])}
      />
      {secciones.length > 0 && (
        <JsonLd
          data={menuPagina(
            menuSchema(secciones, "es", undefined, {
              id: `${URL_PAGINA}#menu`,
              nombre: "Bebidas — Casa Tomás",
              url: URL_PAGINA,
            }),
          )}
        />
      )}

      <CartaPageLayout
        titulo="Bebidas"
        subtitulo="Aguas, refrescos, tónicas y cervezas, con el precio de cada una."
        detalle={`${bebidas.length} referencias`}
        migas={[{ nombre: "Carta", path: "/carta" }, { nombre: "Bebidas" }]}
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
                    {etiquetaCategoria(seccion.clave)}
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
          <p className="text-muted-foreground">Las bebidas no están disponibles ahora mismo.</p>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          También puedes consultar la{" "}
          <Link to="/carta/vinos" className="text-accent hover:underline">
            carta de vinos
          </Link>
          .
        </p>
      </CartaPageLayout>
    </>
  );
};

export default CartaBebidasPagina;
