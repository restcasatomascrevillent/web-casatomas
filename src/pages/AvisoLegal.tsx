import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { TelLink } from "@/components/TelLink";
import { AVISO_LEGAL_PATH, CONDICIONES_PATH, POLITICA_PRIVACIDAD_PATH } from "@/lib/condiciones";
import { NEGOCIO, SITE_URL } from "@/lib/negocio";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

/**
 * Datos del titular tal y como figuran en el aviso legal del WordPress antiguo
 * (`/aviso-legal/`, última modificación 08/08/2023). La política de privacidad
 * (`RESPONSABLE_TRATAMIENTO`) dice «Restaurante Casa Tomás» como razón social:
 * aquí manda el texto legal vigente. El email no figuraba en el WordPress (el
 * campo estaba vacío) y se toma de `NEGOCIO`.
 */
const TITULAR = {
  nombreComercial: "Restaurante Casa Tomás",
  denominacionSocial: "MASIDE 2011 SL",
  cif: "B54583356",
  domicilio: `${NEGOCIO.calle}, ${NEGOCIO.cp} ${NEGOCIO.localidad}, ${NEGOCIO.region}.`,
} as const;

const DOMINIO = "www.restaurantecasatomascrevillente.es";

type Seccion = { readonly title: string; readonly paragraphs: readonly string[] };

const SECCIONES: readonly Seccion[] = [
  {
    title: "2. Derechos de propiedad intelectual e industrial",
    paragraphs: [
      "El sitio web, incluyendo a título enunciativo pero no limitativo su programación, edición, compilación y demás elementos necesarios para su funcionamiento, los diseños, logotipos, texto y/o gráficos, son propiedad del RESPONSABLE o, si es el caso, dispone de licencia o autorización expresa por parte de los autores. Todos los contenidos del sitio web se encuentran debidamente protegidos por la normativa de propiedad intelectual e industrial, así como inscritos en los registros públicos correspondientes. Independientemente de la finalidad para la que fueran destinados, la reproducción total o parcial, uso, explotación, distribución y comercialización, requiere en todo caso la autorización escrita previa por parte del RESPONSABLE. Cualquier uso no autorizado previamente se considera un incumplimiento grave de los derechos de propiedad intelectual o industrial del autor.",
      `Los diseños, logotipos, texto y/o gráficos ajenos al RESPONSABLE y que pudieran aparecer en el sitio web, pertenecen a sus respectivos propietarios, siendo ellos mismos responsables de cualquier posible controversia que pudiera suscitarse respecto a los mismos. El RESPONSABLE autoriza expresamente a que terceros puedan redirigir directamente a los contenidos concretos del sitio web, y en todo caso redirigir al sitio web principal de ${DOMINIO}.`,
      "El RESPONSABLE reconoce a favor de sus titulares los correspondientes derechos de propiedad intelectual e industrial, no implicando su sola mención o aparición en el sitio web la existencia de derechos o responsabilidad alguna sobre los mismos, como tampoco respaldo, patrocinio o recomendación por parte del mismo.",
      `Para realizar cualquier tipo de observación respecto a posibles incumplimientos de los derechos de propiedad intelectual o industrial, así como sobre cualquiera de los contenidos del sitio web, puede hacerlo a través del correo electrónico ${NEGOCIO.email}.`,
    ],
  },
  {
    title: "3. Exención de responsabilidades",
    paragraphs: [
      "El RESPONSABLE se exime de cualquier tipo de responsabilidad derivada de la información publicada en su sitio web siempre que no tenga conocimiento efectivo de que esta información haya sido manipulada o introducida por un tercero ajeno al mismo o, si lo tiene, haya actuado con diligencia para retirar los datos o hacer imposible el acceso a ellos.",
    ],
  },
  {
    title: "Política de enlaces",
    paragraphs: [
      "Desde el sitio web, es posible que se redirija a contenidos de terceros sitios web. Dado que el RESPONSABLE no puede controlar siempre los contenidos introducidos por terceros en sus respectivos sitios web, no asume ningún tipo de responsabilidad respecto a dichos contenidos. En todo caso, procederá a la retirada inmediata de cualquier contenido que pudiera contravenir la legislación nacional o internacional, la moral o el orden público, procediendo a la retirada inmediata de la redirección a dicho sitio web, poniendo en conocimiento de las autoridades competentes el contenido en cuestión.",
      "El RESPONSABLE no se hace responsable de la información y contenidos almacenados, a título enunciativo pero no limitativo, en foros, chats, generadores de blogs, comentarios, redes sociales o cualquier otro medio que permita a terceros publicar contenidos de forma independiente en la página web del RESPONSABLE. Sin embargo, y en cumplimiento de lo dispuesto en los artículos 11 y 16 de la LSSICE, se pone a disposición de todos los usuarios, autoridades y fuerzas de seguridad, colaborando de forma activa en la retirada o, en su caso, bloqueo de todos aquellos contenidos que puedan afectar o contravenir la legislación nacional o internacional, los derechos de terceros o la moral y el orden público. En caso de que el usuario considere que existe en el sitio web algún contenido que pudiera ser susceptible de esta clasificación, se ruega lo notifique de forma inmediata al administrador del sitio web.",
      "Este sitio web se ha revisado y probado para que funcione correctamente. En principio, puede garantizarse el correcto funcionamiento los 365 días del año, 24 horas al día. Sin embargo, el RESPONSABLE no descarta la posibilidad de que existan ciertos errores de programación, o que acontezcan causas de fuerza mayor, catástrofes naturales, huelgas o circunstancias semejantes que hagan imposible el acceso a la página web.",
    ],
  },
  {
    title: "Direcciones IP",
    paragraphs: [
      "Los servidores del sitio web podrán detectar de manera automática la dirección IP y el nombre de dominio utilizados por el usuario. Una dirección IP es un número asignado automáticamente a un ordenador cuando este se conecta a Internet. Toda esta información se registra en un fichero de actividad del servidor debidamente inscrito que permite el posterior procesamiento de los datos con el fin de obtener mediciones únicamente estadísticas que permitan conocer el número de impresiones de páginas, el número de visitas realizadas a los servidores web, el orden de visitas, el punto de acceso, etc.",
    ],
  },
  {
    title: "4. Ley aplicable y jurisdicción",
    paragraphs: [
      "Para la resolución de todas las controversias o cuestiones relacionadas con el presente sitio web o de las actividades en él desarrolladas, será de aplicación la legislación española, a la que se someten expresamente las partes, siendo competentes para la resolución de todos los conflictos derivados o relacionados con su uso los Juzgados y Tribunales del domicilio del USUARIO o el lugar del cumplimiento de la obligación.",
    ],
  },
];

/**
 * Aviso legal (LSSI-CE, art. 10). Mismo esqueleto visual que
 * `PoliticaPrivacidad` y `Condiciones` y, como ellas, `noindex` (por eso no
 * entra en el sitemap). Solo en español: ver `AVISO_LEGAL_PATH`.
 *
 * El texto es el del WordPress antiguo. Único cambio de fondo: el apartado de
 * cookies del WordPress describía las cookies de aquella web; las de esta se
 * explican en la política de privacidad, y aquí se remite a ella.
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
          className="inline-flex items-center gap-2 text-stone hover:text-accent transition-colors mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold">Aviso legal</h1>
        <p className="text-stone mt-2 text-sm">Ley de Servicios de la Sociedad de la Información (LSSI)</p>
      </div>
    </div>

    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 text-foreground">
      <section className="space-y-2 text-sm text-muted-foreground">
        <p>
          {TITULAR.denominacionSocial}, responsable del sitio web, en adelante RESPONSABLE, pone a disposición de los
          usuarios el presente documento, con el que pretende dar cumplimiento a las obligaciones dispuestas en la Ley
          34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSICE), BOE
          N.º 166, así como informar a todos los usuarios del sitio web respecto a cuáles son las condiciones de uso.
        </p>
        <p>
          Toda persona que acceda a este sitio web asume el papel de usuario, comprometiéndose a la observancia y
          cumplimiento riguroso de las disposiciones aquí dispuestas, así como a cualquier otra disposición legal que
          fuera de aplicación.
        </p>
        <p>
          {TITULAR.denominacionSocial} se reserva el derecho de modificar cualquier tipo de información que pudiera
          aparecer en el sitio web, sin que exista obligación de preavisar o poner en conocimiento de los usuarios dichas
          obligaciones, entendiéndose como suficiente la publicación en el sitio web de {TITULAR.denominacionSocial}.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3 text-accent">1. Datos identificativos</h2>
        <div className="rounded-lg border border-border p-5 space-y-1 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Nombre de dominio:</strong> {DOMINIO}</p>
          <p><strong className="text-foreground">Nombre comercial:</strong> {TITULAR.nombreComercial}</p>
          <p><strong className="text-foreground">Denominación social:</strong> {TITULAR.denominacionSocial}</p>
          <p><strong className="text-foreground">CIF:</strong> {TITULAR.cif}</p>
          <p><strong className="text-foreground">Domicilio social:</strong> {TITULAR.domicilio}</p>
          <p>
            <strong className="text-foreground">Teléfono:</strong>{" "}
            <TelLink className="text-accent underline underline-offset-2 hover:decoration-2" />
          </p>
          <p>
            <strong className="text-foreground">Email:</strong>{" "}
            <a href={`mailto:${NEGOCIO.email}`} className="text-accent underline underline-offset-2 hover:decoration-2">
              {NEGOCIO.email}
            </a>
          </p>
        </div>
      </section>

      {SECCIONES.map((seccion) => (
        <section key={seccion.title}>
          <h2 className="text-xl font-bold mb-3 text-accent">{seccion.title}</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {seccion.paragraphs.map((parrafo) => (
              <p key={parrafo}>{parrafo}</p>
            ))}
            {seccion.title.startsWith("3.") && (
              <p>
                <strong className="text-foreground">Uso de cookies.</strong> Las cookies que utiliza este sitio web, su
                finalidad y cómo cambiar el consentimiento se explican en la{" "}
                <Link to={`${POLITICA_PRIVACIDAD_PATH}#cookies`} className="text-accent underline underline-offset-2 hover:decoration-2">
                  política de privacidad y cookies
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
    </main>

    {/* Tag `<footer>` real: MobileReserveCTA lo busca con
        `document.querySelector("footer")` para ocultar su barra fija. */}
    <footer className="bg-dark-slate text-stone text-center py-6 text-xs mt-8">
      <p>© {new Date().getFullYear()} Restaurante Casa Tomás</p>
      <p className="mt-1">
        <Link to="/" className="underline underline-offset-2 hover:decoration-2 hover:text-accent transition-colors">
          Inicio
        </Link>
        {" · "}
        <Link to={POLITICA_PRIVACIDAD_PATH} className="underline underline-offset-2 hover:decoration-2 hover:text-accent transition-colors">
          Política de privacidad
        </Link>
        {" · "}
        <Link to={CONDICIONES_PATH} className="underline underline-offset-2 hover:decoration-2 hover:text-accent transition-colors">
          Condiciones
        </Link>
      </p>
    </footer>
  </div>
);

export default AvisoLegal;
