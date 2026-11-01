import { Fragment, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { TelLink } from "@/components/TelLink";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import { NEGOCIO, SITE_URL } from "@/lib/negocio";
import {
  ANCLA_CONDICIONES_NEWSLETTER,
  ANCLA_CONDICIONES_RESERVA,
  CONDICIONES_PATH,
  POLITICA_PRIVACIDAD_PATH,
} from "@/lib/condiciones";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

type Seccion = { readonly title: string; readonly paragraphs: readonly string[] };

/**
 * Condiciones de reserva y de la newsletter (es/en/fr). Mismo esqueleto
 * visual que `PoliticaPrivacidad` y, como ella, `noindex`.
 *
 * Existe en las tres ramas (`/condiciones`, `/en/condiciones`,
 * `/fr/condiciones`), igual que el formulario de reserva (`/reservas`,
 * `/en/reservas`, `/fr/reservas`) que enlaza cada casilla a su sección, y la
 * política de privacidad: todos los enlaces se construyen con el idioma
 * activo (`construirRutaIdioma`).
 */
const Condiciones = () => {
  const { t, language } = useTranslations();
  const c = t.conditionsPage;
  const inicio = construirRutaIdioma("/", language);
  const { hash } = useLocation();

  // Las casillas del formulario abren `#reservas` / `#newsletter` en pestaña
  // nueva. El salto nativo del navegador al ancla se pierde al hidratar (aquí
  // no está el Header, que es quien lo resuelve en la portada), así que se
  // repite tras montar.
  //
  // Ese salto nativo es SUAVE (`scroll-behavior: smooth` en index.css) y, con
  // la máquina ocupada, sigue en marcha cuando llega el nuestro: Chrome suma
  // lo que le quedaba y la vista acaba pasada, con el título de la sección
  // fuera de pantalla por arriba (visto en los E2E: 6 de cada 72 cargas con
  // 6 pestañas a la vez). Por eso se vuelve a alinear al terminar cada
  // desplazamiento (`scrollend`) y una vez más pasado ~1 s (Safari sin
  // `scrollend`), durante un rato corto y solo si el visitante no ha tocado
  // la página.
  useEffect(() => {
    const id = hash.replace("#", "");
    if (!id) return;
    const alinear = () => document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
    const temporizadores = [window.setTimeout(alinear, 0), window.setTimeout(alinear, 1000)];
    const fin = window.setTimeout(() => detener(), 2000);
    const interacciones = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    function detener() {
      temporizadores.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(fin);
      window.removeEventListener("scrollend", alinear);
      interacciones.forEach((evento) => window.removeEventListener(evento, detener));
    }
    window.addEventListener("scrollend", alinear);
    interacciones.forEach((evento) => window.addEventListener(evento, detener, { passive: true }));
    return detener;
  }, [hash]);

  /** Sustituye `{phone}` por el teléfono pulsable y `{privacy}` por el enlace a la política. */
  const conEnlaces = (texto: string) =>
    texto.split(/(\{phone\}|\{privacy\})/).map((parte, indice) => {
      if (parte === "{phone}") return <TelLink key={indice} className="text-accent underline underline-offset-2 hover:decoration-2" />;
      if (parte === "{privacy}") {
        return (
          <Link
            key={indice}
            to={construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language)}
            className="text-accent underline underline-offset-2 hover:decoration-2"
          >
            {c.privacyLink}
          </Link>
        );
      }
      return <Fragment key={indice}>{parte}</Fragment>;
    });

  const bloque = (id: string, titulo: string, intro: string, secciones: readonly Seccion[]) => (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-6 space-y-6">
      <div>
        <h2 id={`${id}-titulo`} className="text-2xl font-bold text-foreground">
          {titulo}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">{intro}</p>
      </div>
      {secciones.map((seccion) => (
        <div key={seccion.title}>
          <h3 className="text-lg font-bold mb-2 text-accent">{seccion.title}</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            {seccion.paragraphs.map((parrafo) => (
              <p key={parrafo}>{conEnlaces(parrafo)}</p>
            ))}
          </div>
        </div>
      ))}
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={c.seoTitle}
        description={c.seoDescription}
        canonical={`${SITE_URL}${construirRutaIdioma(CONDICIONES_PATH, language)}`}
        lang={language}
        noindex
      />
      <main id={ID_CONTENIDO} tabIndex={-1} className="outline-none">
      {/* Header */}
      <div className="bg-dark-slate text-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            to={inicio}
            className="inline-flex items-center gap-2 text-stone hover:text-accent transition-colors mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {c.back}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{c.title}</h1>
          <p className="text-stone mt-2 text-sm">{c.updated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 text-foreground">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{c.intro}</p>
          <nav aria-label={c.tocLabel} className="rounded-lg border border-border p-4 text-sm">
            <p className="font-semibold mb-2">{c.tocLabel}</p>
            <ul className="space-y-1">
              <li>
                <a href={`#${ANCLA_CONDICIONES_RESERVA}`} className="text-accent underline underline-offset-2 hover:decoration-2">
                  {c.bookingHeading}
                </a>
              </li>
              <li>
                <a href={`#${ANCLA_CONDICIONES_NEWSLETTER}`} className="text-accent underline underline-offset-2 hover:decoration-2">
                  {c.newsletterHeading}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {bloque(ANCLA_CONDICIONES_RESERVA, c.bookingHeading, c.bookingIntro, c.bookingSections)}
        {bloque(ANCLA_CONDICIONES_NEWSLETTER, c.newsletterHeading, c.newsletterIntro, c.newsletterSections)}

        {/* Contacto: los mismos datos que la política de privacidad (`NEGOCIO`). */}
        <section className="rounded-lg bg-muted/40 border border-border p-6">
          <h2 className="text-xl font-bold mb-2 text-accent">{c.contactTitle}</h2>
          <p className="text-sm text-muted-foreground">{c.contactIntro}</p>
          <div className="mt-3 text-sm space-y-1">
            <p>
              <TelLink className="text-accent underline underline-offset-2 hover:decoration-2" />
            </p>
            <p>
              <a href={`mailto:${NEGOCIO.email}`} className="text-accent underline underline-offset-2 hover:decoration-2">
                {NEGOCIO.email}
              </a>
            </p>
            <p>
              {NEGOCIO.calle} — {NEGOCIO.cp} {NEGOCIO.localidad} ({NEGOCIO.region})
            </p>
          </div>
        </section>
      </div>
      </main>

      {/* Tag `<footer>` real: MobileReserveCTA lo busca con
          `document.querySelector("footer")` para ocultar su barra fija. */}
      <footer className="bg-dark-slate text-stone text-center py-6 text-xs mt-8">
        <p>© {new Date().getFullYear()} Restaurante Casa Tomás</p>
        <p className="mt-1">
          <Link to={inicio} className="underline underline-offset-2 hover:decoration-2 hover:text-accent transition-colors">
            {c.homeLink}
          </Link>
          {" · "}
          <Link
            to={construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language)}
            className="underline underline-offset-2 hover:decoration-2 hover:text-accent transition-colors"
          >
            {c.privacyFooterLink}
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default Condiciones;
