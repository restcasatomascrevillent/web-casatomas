import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2, MailX } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { LOGO_HEIGHT, LOGO_WIDTH, logoSmall } from "@/assets/logo";
import {
  formatearFechaBaja,
  leerParametrosBaja,
  llamarBaja,
  type ParametrosBaja,
  type RespuestaBaja,
} from "@/lib/newsletter-baja";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";

/**
 * /newsletter/baja?sid&via&sig — baja del newsletter (RGPD). Ver
 * `src/lib/newsletter-baja.ts`. Al abrirla solo se CONSULTA (los escáneres de
 * correo no dan de baja a nadie); la baja la hace el botón (POST).
 * Cascarón prerenderizado sin datos; `noindex`.
 */
type Fase =
  | { tipo: "cargando" }
  | { tipo: "sin_parametros" }
  | { tipo: "lista"; r: RespuestaBaja; enviando: boolean }
  | { tipo: "sin_conexion"; reintentar: "consultar" | "confirmar" };

const NewsletterBaja = () => {
  const [fase, setFase] = useState<Fase>({ tipo: "cargando" });
  const params = useRef<ParametrosBaja | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const llamar = useCallback(async (modo: "consultar" | "confirmar") => {
    const p = params.current;
    if (!p) return setFase({ tipo: "sin_parametros" });
    setFase((f) => (modo === "confirmar" && f.tipo === "lista" ? { ...f, enviando: true } : { tipo: "cargando" }));
    try {
      setFase({ tipo: "lista", r: await llamarBaja(modo, p), enviando: false });
    } catch {
      setFase({ tipo: "sin_conexion", reintentar: modo });
    }
  }, []);

  useEffect(() => {
    params.current = leerParametrosBaja(window.location.search);
    void llamar("consultar");
  }, [llamar]);

  const clave = fase.tipo === "lista" ? `${fase.r.estado}-${fase.enviando}` : fase.tipo;
  useEffect(() => {
    if (fase.tipo !== "cargando") tituloRef.current?.focus();
  }, [clave, fase.tipo]);

  let contenido: React.ReactNode;
  if (fase.tipo === "cargando") {
    contenido = (
      <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground" role="status">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <p>Cargando…</p>
      </div>
    );
  } else if (fase.tipo === "sin_parametros" || (fase.tipo === "lista" && fase.r.estado === "invalido")) {
    contenido = (
      <Bloque tituloRef={tituloRef} icono="aviso" titulo="Enlace no válido">
        Este enlace de baja no es válido o ha caducado. Para dejar de recibir nuestros correos, usa el enlace del último
        email que te hayamos enviado.
      </Bloque>
    );
  } else if (fase.tipo === "sin_conexion" || (fase.tipo === "lista" && fase.r.estado === "error")) {
    const reintentar = fase.tipo === "sin_conexion" ? fase.reintentar : "consultar";
    contenido = (
      <>
        <Bloque tituloRef={tituloRef} icono="aviso" titulo="Ha ocurrido un error">
          No hemos podido procesar tu solicitud. Inténtalo de nuevo en unos minutos.
        </Bloque>
        <Button className="mt-6 w-full min-h-12 text-base" onClick={() => void llamar(reintentar)}>
          Reintentar
        </Button>
      </>
    );
  } else if (fase.r.estado === "confirmar") {
    contenido = (
      <>
        <Bloque tituloRef={tituloRef} icono="baja" titulo="¿Seguro que quieres darte de baja?">
          Vamos a quitar <strong className="text-foreground break-all">{fase.r.email}</strong> de nuestra lista de noticias
          y ofertas. Si tienes una reserva, seguirás recibiendo sus correos igualmente.
        </Bloque>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full min-h-12 text-base"
            disabled={fase.enviando}
            onClick={() => void llamar("confirmar")}
          >
            {fase.enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {fase.enviando ? "Procesando…" : "Confirmar baja"}
          </Button>
          <Button asChild variant="ghost" className="w-full min-h-12 text-base">
            <Link to="/">No, quiero seguir recibiendo correos</Link>
          </Button>
        </div>
      </>
    );
  } else {
    const fecha = formatearFechaBaja(fase.r.fechaBaja);
    contenido = (
      <>
        <Bloque tituloRef={tituloRef} icono="ok" titulo="Te echaremos de menos">
          {fase.r.estado === "ya_estaba" ? "Tu correo " : "Hemos quitado "}
          <strong className="text-foreground break-all">{fase.r.email}</strong>
          {fase.r.estado === "ya_estaba"
            ? " ya estaba dado de baja de nuestra lista de noticias y ofertas."
            : " de nuestra lista de noticias y ofertas."}
          {fecha ? <span className="mt-2 block text-sm">Baja registrada el {fecha}.</span> : null}
        </Bloque>
        <Button asChild variant="outline" className="mt-6 w-full min-h-12 text-base">
          <Link to="/">Volver a la web</Link>
        </Button>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex flex-col">
      <Seo title="Baja del newsletter | Casa Tomás Restaurante" description="Darse de baja de las noticias de Casa Tomás." noindex />
      <header className="px-4 py-4 flex justify-center border-b border-border bg-background">
        <Link to="/" aria-label="Casa Tomás, ir al inicio">
          <img
            src={logoSmall.src}
            srcSet={logoSmall.srcSet}
            sizes="70px"
            alt="Casa Tomás"
            className="h-12 w-auto aspect-[800/550]"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            decoding="async"
          />
        </Link>
      </header>
      <main id={ID_CONTENIDO} tabIndex={-1} className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12 outline-none">
        <section
          className="w-full max-w-md rounded-xl border border-border bg-card shadow-[var(--shadow-elegant)] p-6 sm:p-8"
          aria-busy={fase.tipo === "cargando" || (fase.tipo === "lista" && fase.enviando)}
        >
          <div aria-live="polite">{contenido}</div>
        </section>
      </main>
    </div>
  );
};

const ICONOS = {
  ok: { Icono: CheckCircle2, clase: "text-emerald-700 bg-emerald-50" },
  aviso: { Icono: AlertTriangle, clase: "text-amber-700 bg-amber-50" },
  baja: { Icono: MailX, clase: "text-dark-slate bg-muted/60" },
} as const;

function Bloque({
  tituloRef,
  icono,
  titulo,
  children,
}: {
  tituloRef: React.RefObject<HTMLHeadingElement>;
  icono: keyof typeof ICONOS;
  titulo: string;
  children: React.ReactNode;
}) {
  const { Icono, clase } = ICONOS[icono];
  return (
    <div className="text-center">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${clase}`}>
        <Icono className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 ref={tituloRef} tabIndex={-1} className="font-serif text-2xl font-bold text-foreground outline-none">
        {titulo}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export default NewsletterBaja;
