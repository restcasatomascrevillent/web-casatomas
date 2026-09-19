import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import datos from "virtual:carta-ssg/vinos";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import ListaPrecios, { type FilaPrecio } from "@/components/carta/ListaPrecios";
import { agruparPorCategoria } from "@/lib/carta-ssg";
import { etiquetaCategoria, slugificar } from "@/lib/carta-rutas";
import { breadcrumbSchema, menuPagina, menuSchema, SITE_URL } from "@/lib/negocio";
import type { VinoSSG } from "@/lib/carta-ssg-types";

const URL_PAGINA = `${SITE_URL}/carta/vinos`;

/** "D.O. Rioja · La Rioja, España" a partir de lo que haya. Sin inventar nada. */
const origenDe = (vino: VinoSSG) =>
  [
    vino.denominacion_origen ? `D.O. ${vino.denominacion_origen}` : null,
    [vino.ubicacion_region, vino.ubicacion_pais].filter(Boolean).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ") || undefined;

const aFila = (vino: VinoSSG, indice: number): FilaPrecio => ({
  id: vino.id ?? `${vino.nombre}-${indice}`,
  nombre: vino.nombre,
  detalle: origenDe(vino),
  precio: vino.precio_eur,
  unidad: vino.unidad,
});

/**
 * `/carta/vinos` — las 185 referencias de la bodega, todas visibles.
 *
 * VERIFICACIÓN DE EDAD. La sección de vinos de la portada abre un `Dialog` de
 * Radix al montarse, y eso aquí no sirve por tres motivos: el diálogo se
 * portaliza a `<body>` y en Node no llega a renderizarse (el prerenderizado
 * saldría vacío), el contenido quedaría detrás de una interacción (justo lo que
 * se acaba de retirar de esta web) y un modal al cargar es un patrón que Google
 * penaliza como intersticial. Se sustituye por un aviso permanente y visible:
 * la ley española restringe la VENTA y el suministro de alcohol a menores, no
 * mostrar la lista de lo que sirve un restaurante — la carta física se entrega
 * en mesa a todo el mundo. La portada conserva su diálogo sin cambios.
 */
const CartaVinosPagina = () => {
  const vinos = datos.vinos ?? [];
  // `imagen_url` se descarta antes de construir el JSON-LD: `ListaPrecios` no
  // pinta fotos, y declarar en los datos estructurados una imagen que la página
  // no enseña es describir algo que el visitante no ve. Hoy ninguna de las 185
  // filas trae foto; esto lo deja bien atado si alguien la sube desde el panel.
  const secciones = agruparPorCategoria(
    vinos.map(({ imagen_url: _imagen, ...resto }) => resto),
    "es",
  );

  return (
    <>
      <Seo
        title="Carta de vinos y precios | Casa Tomás Crevillent"
        description={`Bodega de Casa Tomás en Crevillent (Alicante): ${vinos.length} referencias con su denominación de origen y su precio. Tintos, blancos, cavas y generosos.`}
        canonical={URL_PAGINA}
        keywords={[
          "carta de vinos Crevillent",
          "bodega restaurante Alicante",
          "vinos Casa Tomás",
          "denominación de origen",
        ]}
      />
      <JsonLd
        data={breadcrumbSchema([
          { nombre: "Carta", path: "/carta" },
          { nombre: "Vinos", path: "/carta/vinos" },
        ])}
      />
      {secciones.length > 0 && (
        <JsonLd
          data={menuPagina(
            menuSchema(secciones, "es", undefined, {
              id: `${URL_PAGINA}#menu`,
              nombre: "Carta de vinos — Casa Tomás",
              url: URL_PAGINA,
            }),
          )}
        />
      )}

      <CartaPageLayout
        titulo="Carta de vinos"
        subtitulo="Nuestra bodega, con la denominación de origen y el precio de cada referencia."
        detalle={`${vinos.length} referencias`}
        migas={[{ nombre: "Carta", path: "/carta" }, { nombre: "Vinos" }]}
      >
        <Alert className="mb-10 border-accent/40 bg-accent/5">
          <AlertCircle className="h-5 w-5 text-accent" />
          <AlertTitle className="font-semibold">Solo para mayores de 18 años</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            La venta y el suministro de bebidas alcohólicas a menores de 18 años está prohibido.
            Disfrútalo con moderación.
          </AlertDescription>
        </Alert>

        {secciones.length > 0 ? (
          <div className="space-y-12">
            {secciones.map((seccion) => (
              <section
                key={seccion.clave}
                id={slugificar(seccion.clave) || undefined}
                aria-labelledby={`vinos-${slugificar(seccion.clave)}`}
                className="animate-fade-up"
              >
                <div className="flex items-baseline justify-between gap-4 mb-4">
                  <h2
                    id={`vinos-${slugificar(seccion.clave)}`}
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
          <p className="text-muted-foreground">La carta de vinos no está disponible ahora mismo.</p>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          ¿Buscas algo para acompañar?{" "}
          <Link to="/carta/bebidas" className="text-accent hover:underline">
            Ver las bebidas sin alcohol
          </Link>
          .
        </p>
      </CartaPageLayout>
    </>
  );
};

export default CartaVinosPagina;
