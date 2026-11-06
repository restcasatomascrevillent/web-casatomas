import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";
import { Seo } from "@/components/Seo";
import { TelLink } from "@/components/TelLink";
import { AREA_TOQUE_EMAIL } from "@/lib/area-toque";
import { AVISO_LEGAL_PATH, CONDICIONES_PATH, POLITICA_PRIVACIDAD_PATH } from "@/lib/condiciones";
import { NEGOCIO, SITE_URL, TITULAR } from "@/lib/negocio";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

/** Dominio en el que se publica la web (el de `SITE_URL`). */
const DOMINIO = new URL(SITE_URL).host;

type Seccion = { readonly id: string; readonly title: string; readonly paragraphs: readonly string[] };

/**
 * Texto del aviso legal (04/11/2026, revisado a petición del dueño: «básate en la información real
 * de la web»). Describe lo
 * que la web hace de verdad: carta, reservas, cheques regalo con pago por Stripe, tienda-escaparate
 * de vinos (sin venta online), asistente automático (chat) y la votación del vino favorito. Los
 * datos personales y las cookies van en la política de privacidad, a la que se remite.
 */
const SECCIONES: readonly Seccion[] = [
  {
    id: "objeto",
    title: "2. Objeto y servicios del sitio web",
    paragraphs: [
      `El sitio web ${DOMINIO} da a conocer el restaurante y permite: consultar la carta de platos, vinos y bebidas con sus precios y alérgenos; pedir mesa mediante el formulario de reservas; comprar cheques regalo, que se pagan en línea con tarjeta a través de la pasarela de pago Stripe; consultar la tienda de vinos, que es un escaparate (las botellas se compran en el restaurante, no se venden ni se envían por internet); hacer preguntas a un asistente automático (chat); suscribirse a la newsletter, y, cuando esté abierta, participar en la votación del vino favorito.`,
      "Las reservas y la newsletter tienen sus propias condiciones, que se aceptan al enviar el formulario de reserva. Los cheques regalo son válidos durante 12 meses desde la fecha de compra. El tratamiento de los datos personales se explica en la política de privacidad.",
    ],
  },
  {
    id: "uso",
    title: "3. Condiciones de uso",
    paragraphs: [
      "Quien accede al sitio web es usuario y acepta este aviso legal. El usuario se compromete a hacer un uso lícito de la web y de sus formularios, a facilitar datos veraces y a no introducir contenidos ilícitos, ofensivos o que dañen a terceros, ni intentar acceder a zonas restringidas o alterar su funcionamiento.",
      "La carta de vinos y la tienda de vinos se dirigen a mayores de 18 años. La venta y el suministro de bebidas alcohólicas a menores de 18 años están prohibidos; la edad se comprueba en el restaurante al servir o vender.",
    ],
  },
  {
    id: "contenidos",
    title: "4. Información de la carta, precios y alérgenos",
    paragraphs: [
      "Los precios de la web incluyen el IVA. La carta, los precios, las fotos y la disponibilidad de los productos pueden cambiar sin previo aviso; en caso de diferencia, prevalece la información que se facilite en el restaurante.",
      "La información sobre alérgenos se ofrece de acuerdo con el Reglamento (UE) 1169/2011. Antes de pedir, comunique al personal cualquier alergia o intolerancia: le confirmará la composición del plato y el riesgo de contaminación cruzada.",
      "Las respuestas del asistente automático (chat) se generan de forma automática a partir de la información de la web y son orientativas: no sustituyen la confirmación del personal sobre reservas, alérgenos o precios.",
    ],
  },
  {
    id: "propiedad",
    title: "5. Propiedad intelectual e industrial",
    paragraphs: [
      `Los textos, fotografías, logotipos, el diseño y el código del sitio web pertenecen a ${TITULAR.denominacionSocial} o a sus autores, que han autorizado su uso. No se pueden reproducir, distribuir, transformar ni comunicar públicamente, total o parcialmente, sin autorización previa y por escrito, salvo para uso personal y privado.`,
      "Las marcas, logotipos y contenidos de terceros que aparezcan en la web pertenecen a sus titulares. Se permite enlazar a cualquier página de la web, siempre que el enlace no induzca a error sobre su origen.",
    ],
  },
  {
    id: "responsabilidad",
    title: "6. Responsabilidad y enlaces",
    paragraphs: [
      "La web se revisa para que funcione correctamente, pero no se puede garantizar que esté disponible en todo momento ni libre de errores por causas técnicas o ajenas al titular. El titular no responde de los daños que se deriven de una interrupción del servicio ni de un uso indebido de la web por parte del usuario.",
      "La web enlaza a servicios de terceros (redes sociales, Google, la pasarela de pago, el mapa de vinos). El titular no controla sus contenidos ni responde de ellos; si tiene conocimiento de que un enlace lleva a contenidos ilícitos, lo retirará, conforme a los artículos 16 y 17 de la LSSI-CE.",
    ],
  },
  {
    id: "datos",
    title: "7. Datos personales y cookies",
    paragraphs: [
      "Los datos personales que se facilitan en la web (reservas, cheques regalo, newsletter, chat y votación) los trata el titular conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018. Quién los trata, para qué, durante cuánto tiempo, con qué proveedores y cómo ejercer sus derechos se explica en la política de privacidad, que también detalla las cookies que usa la web.",
    ],
  },
  {
    id: "reclamaciones",
    title: "8. Reclamaciones, ley aplicable y jurisdicción",
    paragraphs: [
      `Para cualquier queja o reclamación puede escribirnos a ${NEGOCIO.email}, llamarnos o pedir una hoja de reclamaciones oficial en el restaurante.`,
      "Este aviso legal se rige por la legislación española. Si el usuario es consumidor, son competentes los juzgados y tribunales de su domicilio, conforme a la normativa de consumidores y usuarios.",
    ],
  },
];

/**
 * Aviso legal (LSSI-CE, art. 10). Mismo esqueleto visual que `PoliticaPrivacidad` y `Condiciones`
 * y, como ellas, `noindex` (por eso no entra en el sitemap). Solo en español: ver
 * `AVISO_LEGAL_PATH`. Los datos del titular vienen de `TITULAR` (`lib/negocio.ts`).
 */
const AvisoLegal = () => (
  <div className="min-h-screen bg-background">
    <Seo
      title="Aviso legal | Casa Tomás Restaurante"
      description="Aviso legal de Casa Tomás Restaurante (Crevillent, Alicante): datos identificativos del titular y condiciones de uso del sitio web conforme a la LSSI-CE."
      canonical={`${SITE_URL}${AVISO_LEGAL_PATH}`}
      lang="es"
      noindex
    />
    <main id={ID_CONTENIDO} tabIndex={-1} className="outline-none">
    <div className="bg-dark-slate text-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="-mt-3 mb-1 inline-flex min-h-11 items-center gap-2 text-stone-light hover:text-gold-light transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold">Aviso legal</h1>
        <p className="text-stone-light mt-2 text-sm">Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE) · Última actualización: noviembre de 2026</p>
      </div>
    </div>

    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 text-foreground">
      <section className="space-y-2 text-sm text-muted-foreground">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
          Información y de Comercio Electrónico (LSSI-CE), estos son los datos del titular de este sitio web y las
          condiciones de su uso.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3 text-accent">1. Datos del titular</h2>
        <div className="rounded-lg border border-border p-5 space-y-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          <p><strong className="text-foreground">Titular:</strong> {TITULAR.denominacionSocial} (sociedad unipersonal)</p>
          <p><strong className="text-foreground">Nombre comercial:</strong> {TITULAR.nombreComercial}</p>
          <p><strong className="text-foreground">CIF:</strong> {TITULAR.cif}</p>
          <p><strong className="text-foreground">Domicilio:</strong> {TITULAR.domicilio}</p>
          {TITULAR.registroMercantil && (
            <p><strong className="text-foreground">Datos registrales:</strong> {TITULAR.registroMercantil}</p>
          )}
          <p>
            <strong className="text-foreground">Teléfono:</strong>{" "}
            <TelLink className="text-accent underline underline-offset-2 hover:decoration-2" />
          </p>
          <p>
            <strong className="text-foreground">Email:</strong>{" "}
            <a href={`mailto:${NEGOCIO.email}`} className={`${AREA_TOQUE_EMAIL} text-accent underline underline-offset-2 hover:decoration-2`}>
              {NEGOCIO.email}
            </a>
          </p>
          <p><strong className="text-foreground">Sitio web:</strong> {DOMINIO}</p>
        </div>
      </section>

      {SECCIONES.map((seccion) => (
        <section key={seccion.id} id={seccion.id}>
          <h2 className="text-xl font-bold mb-3 text-accent">{seccion.title}</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {seccion.paragraphs.map((parrafo) => (
              <p key={parrafo}>{parrafo}</p>
            ))}
            {seccion.id === "objeto" && (
              <p>
                <Link to={CONDICIONES_PATH} className="inline-flex min-h-11 items-center text-accent underline underline-offset-2 hover:decoration-2">
                  Condiciones de reserva y newsletter
                </Link>
              </p>
            )}
            {seccion.id === "datos" && (
              <p>
                <Link to={POLITICA_PRIVACIDAD_PATH} className="inline-flex min-h-11 items-center text-accent underline underline-offset-2 hover:decoration-2">
                  Política de privacidad y cookies
                </Link>
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
    </main>

    {/* Pie común de toda la web (también lleva el `<footer>` real que
        busca MobileReserveCTA para ocultar su barra fija al llegar abajo). */}
    <Footer />
  </div>
);

export default AvisoLegal;
