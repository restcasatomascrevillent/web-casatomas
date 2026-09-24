import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin, Phone, Users, AlertTriangle, Info, XCircle } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { LOGO_HEIGHT, LOGO_WIDTH, logoSmall } from "@/assets/logo";
import { PHONE_DISPLAY, PHONE_HREF } from "@/components/TelLink";
import {
  ErrorConexion,
  formatearFecha,
  leerToken,
  llamarEnlace,
  textosEstado,
  type RespuestaEnlace,
  type Tono,
} from "@/lib/respuesta-reserva";

/**
 * /reserva/respuesta?token=... — página de los botones "Aceptar" / "Rechazar"
 * de los correos de reserva (ver `src/lib/respuesta-reserva.ts`).
 *
 * El SSG prerenderiza solo el cascarón ("Cargando…"): el token se lee en el
 * navegador (useEffect), nunca en el build, y la página es `noindex`.
 * Dos pasos: al abrirla solo se CONSULTA; la acción la lanza el botón (POST).
 */
type Fase =
  | { tipo: "cargando" }
  | { tipo: "sin_token" }
  | { tipo: "lista"; respuesta: RespuestaEnlace; enviando: boolean }
  | { tipo: "sin_conexion"; reintentar: "consultar" | "ejecutar" };

const ICONO: Record<Tono, typeof Info> = {
  exito: CheckCircle2,
  aviso: AlertTriangle,
  peligro: XCircle,
  neutro: Info,
};

const COLOR_ICONO: Record<Tono, string> = {
  exito: "text-emerald-700 bg-emerald-50",
  aviso: "text-amber-700 bg-amber-50",
  peligro: "text-red-700 bg-red-50",
  neutro: "text-dark-slate bg-muted/60",
};

const RespuestaReserva = () => {
  const [fase, setFase] = useState<Fase>({ tipo: "cargando" });
  const tokenRef = useRef<string | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const consultar = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return setFase({ tipo: "sin_token" });
    setFase({ tipo: "cargando" });
    try {
      setFase({ tipo: "lista", respuesta: await llamarEnlace("consultar", token), enviando: false });
    } catch (e) {
      if (!(e instanceof ErrorConexion)) console.error("[respuesta-reserva]", e);
      setFase({ tipo: "sin_conexion", reintentar: "consultar" });
    }
  }, []);

  const ejecutar = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    setFase((f) => (f.tipo === "lista" ? { ...f, enviando: true } : f));
    try {
      setFase({ tipo: "lista", respuesta: await llamarEnlace("ejecutar", token), enviando: false });
    } catch (e) {
      if (!(e instanceof ErrorConexion)) console.error("[respuesta-reserva]", e);
      setFase({ tipo: "sin_conexion", reintentar: "ejecutar" });
    }
  }, []);

  useEffect(() => {
    tokenRef.current = leerToken(window.location.search);
    void consultar();
  }, [consultar]);

  // Al cambiar de estado, el foco va al título: el lector de pantalla anuncia el resultado.
  const clave = fase.tipo === "lista" ? `${fase.respuesta.estado}-${fase.enviando}` : fase.tipo;
  useEffect(() => {
    if (fase.tipo !== "cargando") tituloRef.current?.focus();
  }, [clave, fase.tipo]);

  const negocio = fase.tipo === "lista" ? fase.respuesta.negocio : null;
  const telHref = negocio?.telefonoDigits ? `tel:+34${negocio.telefonoDigits}` : PHONE_HREF;
  const telTexto = negocio?.telefonoTexto || PHONE_DISPLAY;
  const nombreNegocio = negocio?.nombre || "Casa Tomás";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex flex-col">
      <Seo title="Tu reserva | Casa Tomás Restaurante" description="Responde a la propuesta de reserva de Casa Tomás." noindex />

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

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
        <section
          className="w-full max-w-md rounded-xl border border-border bg-card shadow-[var(--shadow-elegant)] p-6 sm:p-8"
          aria-busy={fase.tipo === "cargando" || (fase.tipo === "lista" && fase.enviando)}
        >
          <div aria-live="polite">
            {fase.tipo === "cargando" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground" role="status">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                <p>Cargando tu reserva…</p>
              </div>
            ) : fase.tipo === "sin_token" ? (
              <Estado
                tituloRef={tituloRef}
                tono="neutro"
                titulo="Falta el enlace de tu correo"
                parrafos={["Abre esta página desde el botón del correo que te enviamos."]}
              />
            ) : fase.tipo === "sin_conexion" ? (
              <>
                <Estado
                  tituloRef={tituloRef}
                  tono="aviso"
                  titulo="No hemos podido conectar"
                  parrafos={[
                    fase.reintentar === "ejecutar"
                      ? "No sabemos si tu respuesta ha llegado. Vuelve a intentarlo: si ya estaba registrada, te lo diremos."
                      : "Comprueba tu conexión e inténtalo de nuevo.",
                  ]}
                />
                <Button
                  className="mt-6 w-full min-h-12 text-base"
                  onClick={() => void (fase.reintentar === "ejecutar" ? ejecutar() : consultar())}
                >
                  Reintentar
                </Button>
              </>
            ) : (
              <Contenido fase={fase} tituloRef={tituloRef} nombreNegocio={nombreNegocio} onConfirmar={ejecutar} />
            )}
          </div>

          <p className="mt-8 pt-5 border-t border-border text-center text-sm text-muted-foreground">
            ¿Dudas? Llámanos al{" "}
            <a href={telHref} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {telTexto}
            </a>
          </p>
        </section>
      </main>
    </div>
  );
};

function Estado({
  tituloRef,
  tono,
  titulo,
  parrafos,
}: {
  tituloRef: React.RefObject<HTMLHeadingElement>;
  tono: Tono;
  titulo: string;
  parrafos: string[];
}) {
  const Icono = ICONO[tono];
  return (
    <div className="text-center">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${COLOR_ICONO[tono]}`}>
        <Icono className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 ref={tituloRef} tabIndex={-1} className="font-serif text-2xl font-bold text-foreground outline-none">
        {titulo}
      </h1>
      {parrafos.map((p) => (
        <p key={p} className="mt-3 text-base leading-relaxed text-muted-foreground">
          {p}
        </p>
      ))}
    </div>
  );
}

function Contenido({
  fase,
  tituloRef,
  nombreNegocio,
  onConfirmar,
}: {
  fase: Extract<Fase, { tipo: "lista" }>;
  tituloRef: React.RefObject<HTMLHeadingElement>;
  nombreNegocio: string;
  onConfirmar: () => void;
}) {
  const { respuesta, enviando } = fase;
  const textos = textosEstado(respuesta, nombreNegocio);
  const d = respuesta.detalles;
  const rechazar = respuesta.accion === "rechazar";

  return (
    <>
      <Estado tituloRef={tituloRef} tono={textos.tono} titulo={textos.titulo} parrafos={textos.parrafos} />

      {textos.conDetalles && d ? (
        <dl className="mt-6 space-y-3 rounded-lg bg-muted/40 p-4 text-sm">
          <Dato icono={CalendarDays} etiqueta="Fecha" valor={formatearFecha(d.fecha)} />
          <Dato icono={Clock} etiqueta="Hora" valor={d.hora} />
          <Dato icono={Users} etiqueta="Comensales" valor={String(d.comensales)} />
          {d.espacio ? <Dato icono={MapPin} etiqueta="Espacio" valor={d.espacio} /> : null}
        </dl>
      ) : null}

      {respuesta.estado === "pendiente" && textos.boton ? (
        <div className="mt-6 flex flex-col gap-3">
          <Button
            size="lg"
            variant={rechazar ? "destructive" : "default"}
            className="w-full min-h-12 text-base"
            disabled={enviando}
            onClick={onConfirmar}
          >
            {enviando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {enviando ? "Enviando…" : textos.boton}
          </Button>
          {rechazar ? (
            <Button asChild variant="ghost" className="w-full min-h-12 text-base">
              <Link to="/">No, volver a la web</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <Button asChild variant="outline" className="mt-6 w-full min-h-12 text-base">
          <Link to="/">Ir a la web de Casa Tomás</Link>
        </Button>
      )}
    </>
  );
}

function Dato({ icono: Icono, etiqueta, valor }: { icono: typeof Info; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icono className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="ml-auto font-semibold text-foreground text-right first-letter:uppercase">{valor}</dd>
    </div>
  );
}

export default RespuestaReserva;
