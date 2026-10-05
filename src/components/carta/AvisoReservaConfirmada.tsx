import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";

/**
 * Lo que deja `RespuestaReserva` en `location.state` al confirmar la reserva
 * desde el correo: solo datos que ya devuelve `emails-reserva`, y en el
 * historial, nunca en la URL.
 */
export interface ReservaConfirmada {
  /** `hecho`: confirmada con este clic; `ya_hecho`: ya lo estaba. */
  estado: "hecho" | "ya_hecho";
  nombre: string;
  /** yyyy-MM-dd */
  fecha: string;
  /** HH:MM */
  hora: string;
  comensales: number;
}

const TEXTOS: Record<
  Language,
  {
    titulo: string;
    gracias: (nombre: string) => string;
    teEsperamos: (fecha: string, hora: string, comensales: number) => string;
    abreBoca: string;
    yaConfirmada: { titulo: string; cuerpo: string };
    verCarta: string;
    cerrar: string;
  }
> = {
  es: {
    titulo: "¡Reserva confirmada!",
    gracias: (nombre) => (nombre ? `Gracias, ${nombre}.` : "¡Gracias!"),
    teEsperamos: (fecha, hora, n) =>
      fecha
        ? `Te esperamos el ${fecha}${hora ? ` a las ${hora}` : ""}${n > 0 ? ` · ${n} ${n === 1 ? "persona" : "personas"}` : ""}.`
        : "¡Te esperamos!",
    abreBoca: "Mientras tanto, aquí tienes nuestra carta para que vayas abriendo boca.",
    yaConfirmada: {
      titulo: "Tu reserva ya estaba confirmada",
      cuerpo: "No tienes que hacer nada más. Mientras tanto, ve abriendo boca con nuestra carta.",
    },
    verCarta: "Ver la carta",
    cerrar: "Cerrar",
  },
  en: {
    titulo: "Booking confirmed!",
    gracias: (nombre) => (nombre ? `Thank you, ${nombre}.` : "Thank you!"),
    teEsperamos: (fecha, hora, n) =>
      fecha
        ? `We look forward to seeing you on ${fecha}${hora ? ` at ${hora}` : ""}${n > 0 ? ` · ${n} ${n === 1 ? "person" : "people"}` : ""}.`
        : "We look forward to seeing you!",
    abreBoca: "In the meantime, here is our menu to whet your appetite.",
    yaConfirmada: {
      titulo: "Your booking was already confirmed",
      cuerpo: "There's nothing else you need to do. In the meantime, whet your appetite with our menu.",
    },
    verCarta: "View the menu",
    cerrar: "Close",
  },
  fr: {
    titulo: "Réservation confirmée !",
    gracias: (nombre) => (nombre ? `Merci, ${nombre}.` : "Merci !"),
    teEsperamos: (fecha, hora, n) =>
      fecha
        ? `Nous vous attendons le ${fecha}${hora ? ` à ${hora}` : ""}${n > 0 ? ` · ${n} ${n === 1 ? "personne" : "personnes"}` : ""}.`
        : "Nous avons hâte de vous accueillir !",
    abreBoca: "En attendant, voici notre carte pour vous mettre en appétit.",
    yaConfirmada: {
      titulo: "Votre réservation était déjà confirmée",
      cuerpo: "Vous n'avez rien d'autre à faire. En attendant, mettez-vous en appétit avec notre carte.",
    },
    verCarta: "Voir la carte",
    cerrar: "Fermer",
  },
};

const LOCALE: Record<Language, string> = { es: "es-ES", en: "en-GB", fr: "fr-FR" };

/**
 * "2026-10-03" -> "sábado, 3 de octubre de 2026" (el mismo texto que
 * `formatearFecha` en la página de respuesta; un test lo vigila) o su
 * equivalente en inglés/francés. Sin zona horaria: es una fecha de calendario.
 * `Intl` y no `formatearFecha` para no meter todo `respuesta-reserva.ts` en el
 * JS de la carta.
 */
function fechaLarga(iso: string, idioma: Language): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(Date.UTC(a, mes - 1, dia));
  if (Number.isNaN(fecha.getTime()) || fecha.getUTCMonth() !== mes - 1) return iso;
  return fecha.toLocaleDateString(LOCALE[idioma], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** El `state` del historial no se da por bueno a ciegas: cualquier campo raro se queda vacío. */
function leerReserva(state: unknown): ReservaConfirmada | null {
  const r = (state as { reservaConfirmada?: Partial<Record<keyof ReservaConfirmada, unknown>> } | null)
    ?.reservaConfirmada;
  if (!r || typeof r !== "object") return null;
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    estado: r.estado === "ya_hecho" ? "ya_hecho" : "hecho",
    nombre: texto(r.nombre),
    fecha: texto(r.fecha),
    hora: texto(r.hora),
    comensales: typeof r.comensales === "number" && r.comensales > 0 ? Math.floor(r.comensales) : 0,
  };
}

/**
 * Aviso de bienvenida de la carta cuando se llega desde «Sí, confirmo la
 * reserva» (`RespuestaReserva` navega aquí con `state.reservaConfirmada`).
 *
 * SSG: en el prerenderizado nunca hay `state`, así que no pinta nada y el HTML
 * de la carta no cambia; el aviso solo existe en el navegador. Al cerrarlo
 * (botón, X, Escape o clic fuera) se borra el `state` con `replace`: no
 * reaparece al recargar ni al volver atrás.
 */
const AvisoReservaConfirmada = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useTranslations();
  const reserva = useMemo(() => leerReserva(location.state), [location.state]);
  // Al cerrar, el `state` ya está borrado mientras el diálogo se anima al
  // salir: se sigue enseñando la última reserva para que no se vacíe de golpe.
  const [mostrada, setMostrada] = useState(reserva);
  if (reserva && reserva !== mostrada) setMostrada(reserva);
  if (!mostrada) return null;

  const t = TEXTOS[language];
  const yaEstaba = mostrada.estado === "ya_hecho";
  const cuerpo = yaEstaba
    ? t.yaConfirmada.cuerpo
    : [
        t.gracias(mostrada.nombre),
        t.teEsperamos(fechaLarga(mostrada.fecha, language), mostrada.hora, mostrada.comensales),
        t.abreBoca,
      ].join(" ");

  const cerrar = () =>
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null, preventScrollReset: true },
    );

  return (
    <Dialog open={reserva !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent
        closeLabel={t.cerrar}
        className="w-[calc(100%-2rem)] rounded-2xl text-center sm:max-w-md sm:rounded-2xl motion-reduce:!animate-none"
      >
        <DialogHeader className="space-y-4 sm:text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <DialogTitle className="font-libre-baskerville text-2xl font-bold leading-tight text-primary">
            {yaEstaba ? t.yaConfirmada.titulo : t.titulo}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">{cuerpo}</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button size="lg" className="mt-2 w-full min-h-12 rounded-full text-base">
            {t.verCarta}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default AvisoReservaConfirmada;
