import { useEffect, useRef, type CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImagenResponsive from "@/components/ImagenResponsive";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TOUZA_URL } from "@/lib/negocio";
import { PAGINAS_INFORMACION } from "@/lib/paginas-informacion";
import { TOUZA } from "@/lib/touza-marca";
import "./touza-pagina.css";

/**
 * Página /touza: cabecera con la foto del local (la misma que abre la web de
 * Touza), entradilla sobre el negro de su marca y el texto con dos fotos más
 * de su barra. Fotos: portada de `TOUZA_URL` (touza-2, -5 y -10), generadas
 * con `scripts/imagenes/gen-responsive.cjs`. Los textos SEO (h1, entradilla,
 * párrafos) salen tal cual de `PAGINAS_INFORMACION`.
 *
 * Animaciones (`touza-pagina.css`): zoom lento en la foto de cabecera, fundido
 * del título y la entradilla, y las fotos de la barra aparecen al llegar con el
 * scroll (escalonadas 120 ms) con un hover suave en escritorio. Sin JS o con
 * `prefers-reduced-motion` todo se ve quieto. Touza no admite reservas: aquí no
 * hay botones de reservar mesa, solo el enlace a su web.
 */
const ALT = {
  interior: {
    es: "Interior de Touza Cocktail Bar en Crevillente: sofá corrido color mostaza, mesas de mármol y luz cálida",
    en: "Inside Touza Cocktail Bar in Crevillente: mustard banquette, marble tables and warm light",
    fr: "Intérieur du Touza Cocktail Bar à Crevillente : banquette moutarde, tables en marbre et lumière chaude",
  },
  coctel: {
    es: "Bartender de Touza colando un cóctel sobre hielo en la barra",
    en: "Touza bartender straining a cocktail over ice at the bar",
    fr: "Barman du Touza filtrant un cocktail sur glace au comptoir",
  },
  barra: {
    es: "Botellas de aperitivo y ron en la barra de Touza Cocktail Bar",
    en: "Bottles of aperitif and rum on the bar at Touza Cocktail Bar",
    fr: "Bouteilles d'apéritif et de rhum sur le comptoir du Touza Cocktail Bar",
  },
} as const;

const BotonTouza = ({ texto }: { texto: string }) => (
  <Button
    asChild
    size="lg"
    className="rounded-full px-8 font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
    style={{ backgroundColor: TOUZA.accent, color: TOUZA.texto }}
  >
    <a href={TOUZA_URL} target="_blank" rel="noopener noreferrer">
      <ExternalLink className="mr-2 h-5 w-5" aria-hidden="true" />
      {texto}
    </a>
  </Button>
);

/**
 * Oculta (data-tz="oculto") las fotos `.tz-revelar` que aún no se ven y las
 * muestra al entrar en pantalla. Las que ya se ven al cargar no se tocan, y sin
 * IntersectionObserver o con menos movimiento no se oculta nada.
 */
function useRevelarFotos() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz || typeof IntersectionObserver === "undefined") return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fotos = Array.from(raiz.querySelectorAll<HTMLElement>(".tz-revelar"));
    const alto = window.innerHeight || document.documentElement.clientHeight;
    const pendientes = fotos.filter(f => f.getBoundingClientRect().top > alto);
    if (pendientes.length === 0) return;
    pendientes.forEach(f => f.setAttribute("data-tz", "oculto"));
    const observador = new IntersectionObserver(entradas => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.removeAttribute("data-tz");
        observador.unobserve(e.target);
      }
    }, { threshold: 0.15 });
    pendientes.forEach(f => observador.observe(f));
    return () => {
      observador.disconnect();
      pendientes.forEach(f => f.removeAttribute("data-tz"));
    };
  }, []);
  return ref;
}

export default function TouzaPagina() {
  const { language, t } = useTranslations();
  const refFotos = useRevelarFotos();
  const texto = PAGINAS_INFORMACION["/touza"][language];
  const tarjeta = t.espacios.cards[3];
  return (
    <>
      {/* Hueco de la cabecera fija (transparente arriba): sobre el fondo del
          sitio, no sobre el negro de Touza, para que el menú se siga leyendo. */}
      <div className="h-16 md:h-20" aria-hidden="true" />
      <section style={{ backgroundColor: TOUZA.bg }}>
        <div className="relative h-[52vh] min-h-[320px] max-h-[620px] w-full overflow-hidden">
          <ImagenResponsive
            nombre="touza-interior"
            sizes="100vw"
            alt={ALT.interior[language]}
            fetchPriority="high"
            decoding="async"
            className="tz-zoom-lento absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: `linear-gradient(to top, ${TOUZA.bg} 0%, rgba(10,10,10,0.55) 35%, rgba(10,10,10,0.05) 70%)` }}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-6 md:pb-10">
            <h1 className="tz-entrada font-libre-baskerville text-3xl font-bold leading-tight text-white drop-shadow md:text-5xl">{texto.h1}</h1>
          </div>
        </div>
        <div className="tz-entrada tz-entrada-2 mx-auto max-w-5xl px-4 pb-10 pt-2 md:pb-14">
          <div className="mb-6 h-px w-16" style={{ backgroundColor: TOUZA.accent }} />
          <p className="max-w-3xl text-lg leading-relaxed text-white/80 md:text-xl">{texto.description}</p>
          <div className="mt-8">
            <BotonTouza texto={t.espacios.visitTouza} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.15fr_1fr] md:gap-14 md:py-20">
        <div className="space-y-6">
          <h2 className="font-libre-baskerville text-2xl font-bold text-primary md:text-4xl">{tarjeta.title}</h2>
          <p className="text-lg font-medium text-foreground">{tarjeta.description}</p>
          {texto.parrafos.map(parrafo => (
            <p key={parrafo} className="text-base leading-relaxed text-muted-foreground md:text-lg">{parrafo}</p>
          ))}
        </div>
        <div ref={refFotos} className="grid grid-cols-2 gap-3 self-start md:gap-4">
          <div className="tz-revelar tz-foto overflow-hidden rounded-2xl shadow-lg">
            <ImagenResponsive
              nombre="touza-coctel"
              sizes="(min-width: 768px) 25vw, 50vw"
              alt={ALT.coctel[language]}
              loading="lazy"
              decoding="async"
              className="aspect-[2/3] h-full w-full object-cover"
            />
          </div>
          <div className="tz-revelar tz-foto mt-8 overflow-hidden rounded-2xl shadow-lg md:mt-12" style={{ "--tz-retraso": "120ms" } as CSSProperties}>
            <ImagenResponsive
              nombre="touza-barra"
              sizes="(min-width: 768px) 25vw, 50vw"
              alt={ALT.barra[language]}
              loading="lazy"
              decoding="async"
              className="aspect-[2/3] h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-center px-4">
        <BotonTouza texto={t.espacios.visitTouza} />
      </div>
    </>
  );
}
