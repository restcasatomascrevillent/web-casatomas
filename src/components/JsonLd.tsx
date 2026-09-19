/**
 * Renderiza datos estructurados como un `<script>` normal del cuerpo.
 *
 * Por qué NO va dentro de `<Head>`: react-helmet inyecta su contenido al
 * principio del `<head>`, por delante del `<meta charset>`. Con el JSON-LD de la
 * carta ahí, el charset acababa en el byte ~19.000 del HTML — la especificación
 * exige que esté en los primeros 1.024. Además helmet pasa el contenido por
 * `String.replace()`, que interpreta `$$`, `$&` y `` $` `` como patrones y
 * corrompe el JSON.
 *
 * Google admite JSON-LD en cualquier punto del documento.
 */
export const JsonLd = ({ data }: { data: object }) => (
  <script
    type="application/ld+json"
    // `<` evita que un `</script>` dentro de un dato cierre la etiqueta.
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
  />
);
