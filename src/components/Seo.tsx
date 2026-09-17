import { Head } from "vite-react-ssg";

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  keywords?: string[];
  schema?: object;
  noindex?: boolean;
}

const DEFAULT_TITLE = "Casa Tomás Restaurante - Tradición y Calidad en Crevillent";
const DEFAULT_DESC = "Casa Tomás Restaurante en Crevillent, Alicante. Más de 30 años de tradición culinaria. Cocina de calidad con productos frescos y ambiente familiar. Reserva tu mesa.";
const DEFAULT_CANONICAL = "https://restaurantecasatomascrevillente.es/";
const DEFAULT_IMAGE = "https://restaurantecasatomascrevillente.es/og-image.jpg";

export function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  canonical = DEFAULT_CANONICAL,
  ogImage = DEFAULT_IMAGE,
  keywords = ["restaurante Crevillent", "Casa Tomás", "cocina tradicional", "restaurante Alicante"],
  schema,
  noindex = false,
}: SeoProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(", ")} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,follow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="es_ES" />
      <meta property="og:site_name" content="Casa Tomás Restaurante" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@CasaTomas" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Head>
  );
}
