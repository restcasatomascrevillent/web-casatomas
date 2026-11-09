import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { formatearDiaEncuesta, marcarVotoEnEsteNavegador, useEncuestaVinos, yaVotoEnEsteNavegador } from "@/hooks/useEncuestaVinos";
import { ANCLA_CONDICIONES_SORTEO, CONDICIONES_PATH, POLITICA_PRIVACIDAD_PATH } from "@/lib/condiciones";
import { nombreVinoVisible } from "@/lib/filtro-vinos";
import { etiquetaTipoVino, tipoVino, TIPOS_VINO } from "@/lib/tipos-vino";
import { construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";

/** Duración del aviso al entrar en la carta de vinos (petición del dueño: «una notificación de 3 segundos»). */
export const DURACION_AVISO_ENCUESTA_MS = 3000;

const TEXTOS = {
  es: {
    avisoTitulo: "Vota tu vino favorito",
    avisoTexto: "Y entra en el sorteo de Casa Tomás.",
    votar: "Votar",
    banner: "Vota tu vino favorito y gana un sorteo",
    yaVotado: "Ya has votado tu vino favorito. ¡Suerte en el sorteo!",
    titulo: "Vota tu vino favorito",
    descripcion: "Elige el vino de nuestra carta que más te gusta. Entre todos los que votéis sorteamos un premio.",
    vino: "Tu vino favorito",
    eligeVino: "Elige un vino…",
    nombre: "Tu nombre",
    contacto: "Email o teléfono",
    contactoAyuda: "Solo para avisarte si ganas.",
    premio: (premio: string, dia: string) => `Premio: ${premio}. Puedes votar hasta el ${dia} (incluido).`,
    basesAntes: "Soy mayor de 18 años, quiero participar en el sorteo y acepto sus",
    basesEnlace: "bases",
    basesDespues: ". Casa Tomás usará mi nombre y mi contacto solo para el sorteo y para avisarme si gano.",
    privacidad: "Política de privacidad",
    pestanaNueva: "(se abre en una pestaña nueva)",
    enviar: "Enviar mi voto",
    enviando: "Enviando…",
    gracias: (vino: string) => `¡Gracias! Tu voto por ${vino} está registrado. Si ganas, te avisaremos.`,
    cerrar: "Cerrar",
    errores: {
      encuesta_cerrada: "La votación está cerrada ahora mismo.",
      vino_no_disponible: "Ese vino ya no está en la carta. Elige otro.",
      datos_no_validos: "Revisa los datos: nombre (2 letras o más), un email o teléfono válido y la casilla del sorteo.",
      ya_participado: "Ya has participado con ese email o teléfono. ¡Solo vale un voto por persona!",
      demasiados_votos: "Ahora mismo hay muchos votos. Inténtalo de nuevo en un rato.",
      generico: "No se ha podido enviar el voto. Inténtalo de nuevo.",
      faltaVino: "Elige un vino.",
    },
  },
  en: {
    avisoTitulo: "Vote for your favourite wine",
    avisoTexto: "And enter the Casa Tomás prize draw.",
    votar: "Vote",
    banner: "Vote for your favourite wine and win a prize draw",
    yaVotado: "You've already voted for your favourite wine. Good luck in the draw!",
    titulo: "Vote for your favourite wine",
    descripcion: "Pick the wine from our list you like best. We'll draw a prize among everyone who votes.",
    vino: "Your favourite wine",
    eligeVino: "Choose a wine…",
    nombre: "Your name",
    contacto: "Email or phone",
    contactoAyuda: "Only to let you know if you win.",
    premio: (premio: string, dia: string) => `Prize: ${premio}. You can vote until ${dia} (inclusive).`,
    basesAntes: "I am 18 or over, I want to enter the prize draw and I accept its",
    basesEnlace: "rules",
    basesDespues: ". Casa Tomás will use my name and contact details only for the draw and to tell me if I win.",
    privacidad: "Privacy policy",
    pestanaNueva: "(opens in a new tab)",
    enviar: "Send my vote",
    enviando: "Sending…",
    gracias: (vino: string) => `Thank you! Your vote for ${vino} has been recorded. If you win, we'll let you know.`,
    cerrar: "Close",
    errores: {
      encuesta_cerrada: "Voting is closed right now.",
      vino_no_disponible: "That wine is no longer on the list. Please choose another.",
      datos_no_validos: "Please check your details: name (2+ letters), a valid email or phone and the prize-draw box.",
      ya_participado: "You've already taken part with that email or phone. One vote per person!",
      demasiados_votos: "There are a lot of votes right now. Please try again in a while.",
      generico: "Your vote couldn't be sent. Please try again.",
      faltaVino: "Choose a wine.",
    },
  },
  fr: {
    avisoTitulo: "Votez pour votre vin préféré",
    avisoTexto: "Et participez au tirage au sort de Casa Tomás.",
    votar: "Voter",
    banner: "Votez pour votre vin préféré et gagnez un tirage au sort",
    yaVotado: "Vous avez déjà voté pour votre vin préféré. Bonne chance pour le tirage !",
    titulo: "Votez pour votre vin préféré",
    descripcion: "Choisissez le vin de notre carte que vous préférez. Nous tirons au sort un prix parmi tous les votants.",
    vino: "Votre vin préféré",
    eligeVino: "Choisissez un vin…",
    nombre: "Votre nom",
    contacto: "E-mail ou téléphone",
    contactoAyuda: "Uniquement pour vous prévenir si vous gagnez.",
    premio: (premio: string, dia: string) => `Prix : ${premio}. Vous pouvez voter jusqu'au ${dia} (inclus).`,
    basesAntes: "J'ai 18 ans ou plus, je souhaite participer au tirage au sort et j'accepte son",
    basesEnlace: "règlement",
    basesDespues: ". Casa Tomás utilisera mon nom et mes coordonnées uniquement pour le tirage et pour me prévenir si je gagne.",
    privacidad: "Politique de confidentialité",
    pestanaNueva: "(s'ouvre dans un nouvel onglet)",
    enviar: "Envoyer mon vote",
    enviando: "Envoi…",
    gracias: (vino: string) => `Merci ! Votre vote pour ${vino} est enregistré. Si vous gagnez, nous vous préviendrons.`,
    cerrar: "Fermer",
    errores: {
      encuesta_cerrada: "Le vote est fermé pour le moment.",
      vino_no_disponible: "Ce vin n'est plus à la carte. Choisissez-en un autre.",
      datos_no_validos: "Vérifiez vos données : nom (2 lettres ou plus), un e-mail ou un téléphone valide et la case du tirage.",
      ya_participado: "Vous avez déjà participé avec cet e-mail ou ce téléphone. Un vote par personne !",
      demasiados_votos: "Il y a beaucoup de votes en ce moment. Réessayez dans un moment.",
      generico: "Votre vote n'a pas pu être envoyé. Réessayez.",
      faltaVino: "Choisissez un vin.",
    },
  },
} satisfies Record<Language, unknown>;

type CodigoError = keyof (typeof TEXTOS)["es"]["errores"];
const CODIGOS: CodigoError[] = ["encuesta_cerrada", "vino_no_disponible", "datos_no_validos", "ya_participado", "demasiados_votos"];

/** El RPC lanza el código en `message` (ver 20261104141000_encuesta_vino_favorito.sql del panel). */
export function codigoErrorVoto(error: unknown): CodigoError {
  const mensaje = String((error as { message?: string } | null)?.message ?? "");
  return CODIGOS.find((c) => mensaje.includes(c)) ?? "generico";
}

export interface VinoVotable {
  id?: string;
  nombre: string;
  nombre_en?: string;
  nombre_fr?: string;
  categoria?: string;
}

let clienteSupabase: Promise<typeof import("@/integrations/supabase/client")> | undefined;
const cargarSupabase = () => (clienteSupabase ??= import("@/integrations/supabase/client"));

/**
 * «Vota tu vino favorito y gana un sorteo» en /carta/vinos (04/11/2026,
 * petición del dueño). Con la votación abierta en el panel:
 *  - al entrar (ya confirmada la edad) sale un aviso de 3 segundos con el botón
 *    «Votar», salvo que este navegador ya haya votado;
 *  - encima de la carta queda un botón para votar en cualquier momento (el
 *    aviso se va solo y no todo el mundo llega a pulsarlo).
 * El voto va por la RPC `votar_vino_favorito` (anon): un voto por email o
 * teléfono, solo vinos publicados en la carta de Casa Tomás.
 */
export default function VotoVinoFavorito({
  vinos,
  listo,
  language,
}: {
  vinos: VinoVotable[];
  /** La carta está a la vista (edad confirmada): hasta entonces no se avisa. */
  listo: boolean;
  language: Language;
}) {
  const textos = TEXTOS[language];
  const { activa, premio, fin } = useEncuestaVinos();
  const { toast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [votado, setVotado] = useState(false);
  const avisado = useRef(false);

  // Se lee después de hidratar: el HTML del build no sabe si este navegador votó.
  useEffect(() => setVotado(yaVotoEnEsteNavegador()), []);

  useEffect(() => {
    if (!activa || !listo || avisado.current || yaVotoEnEsteNavegador()) return;
    avisado.current = true;
    toast({
      title: `🏆 ${textos.avisoTitulo}`,
      description: textos.avisoTexto,
      duration: DURACION_AVISO_ENCUESTA_MS,
      action: (
        <ToastAction altText={textos.avisoTitulo} onClick={() => setAbierto(true)}>
          {textos.votar}
        </ToastAction>
      ),
    });
  }, [activa, listo, textos, toast]);

  if (!activa || !listo) return null;

  return (
    <>
      {votado ? (
        <p className="flex items-center justify-center gap-2 text-center font-sans text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          {textos.yaVotado}
        </p>
      ) : (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAbierto(true)}
            className="h-auto min-h-11 max-w-full whitespace-normal rounded-full border-accent/50 px-5 py-2 font-sans text-sm text-foreground hover:bg-accent/10"
          >
            <Trophy className="mr-2 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {textos.banner}
          </Button>
        </div>
      )}
      <DialogoVoto
        abierto={abierto}
        onAbiertoChange={setAbierto}
        vinos={vinos}
        language={language}
        detallePremio={premio && fin ? textos.premio(premio, formatearDiaEncuesta(fin, language)) : null}
        onVotado={() => {
          marcarVotoEnEsteNavegador();
          setVotado(true);
        }}
      />
    </>
  );
}

function DialogoVoto({
  abierto,
  onAbiertoChange,
  vinos,
  language,
  detallePremio,
  onVotado,
}: {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  vinos: VinoVotable[];
  language: Language;
  /** «Premio: … Puedes votar hasta el …»: lo fija el panel (bases del sorteo, apartado 4). */
  detallePremio: string | null;
  onVotado: () => void;
}) {
  const textos = TEXTOS[language];
  const ids = { vino: useId(), nombre: useId(), contacto: useId(), bases: useId(), ayuda: useId() };
  const [vinoId, setVinoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [bases, setBases] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gracias, setGracias] = useState<string | null>(null);

  // Vinos por tipo (tintos, blancos…) y por nombre, en el idioma de la página.
  const grupos = useMemo(() => {
    const porTipo = new Map<string, { id: string; nombre: string }[]>();
    for (const vino of vinos) {
      if (!vino.id) continue;
      const tipo = tipoVino(vino.categoria);
      const lista = porTipo.get(tipo) ?? [];
      lista.push({ id: vino.id, nombre: nombreVinoVisible(vino, language) });
      porTipo.set(tipo, lista);
    }
    return TIPOS_VINO.filter((t) => t !== "todos" && porTipo.has(t)).map((t) => ({
      tipo: t,
      etiqueta: etiquetaTipoVino(t, language),
      vinos: porTipo.get(t)!.sort((a, b) => a.nombre.localeCompare(b.nombre, language)),
    }));
  }, [vinos, language]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!vinoId) {
      setError(textos.errores.faltaVino);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const { supabase } = await cargarSupabase();
      const { data, error: fallo } = await supabase.rpc("votar_vino_favorito", {
        p_vino_id: vinoId,
        p_nombre: nombre,
        p_contacto: contacto,
        p_acepta_bases: bases,
        p_idioma: language,
      });
      if (fallo) throw fallo;
      const elegido = vinos.find((v) => v.id === vinoId);
      const nombreVino = elegido ? nombreVinoVisible(elegido, language) : String((data as { vino?: string } | null)?.vino ?? "");
      setGracias(textos.gracias(nombreVino));
      onVotado();
    } catch (fallo) {
      const codigo = codigoErrorVoto(fallo);
      setError(textos.errores[codigo]);
      // Si ya votó con ese contacto, no se le vuelve a ofrecer en este navegador.
      if (codigo === "ya_participado") onVotado();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        onAbiertoChange(valor);
        if (!valor) setError(null);
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-libre-baskerville text-lg">
            <Trophy className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            {textos.titulo}
          </DialogTitle>
          <DialogDescription>{textos.descripcion}</DialogDescription>
          {detallePremio && <p className="font-sans text-sm font-medium text-foreground">{detallePremio}</p>}
        </DialogHeader>

        {gracias ? (
          <div className="space-y-4">
            <p role="status" className="flex items-start gap-2 rounded-lg bg-accent/10 p-3 font-sans text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              {gracias}
            </p>
            <Button type="button" className="h-11 w-full rounded-full" onClick={() => onAbiertoChange(false)}>
              {textos.cerrar}
            </Button>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4 font-sans" noValidate>
            <div className="space-y-1.5">
              <label htmlFor={ids.vino} className="text-sm font-medium">{textos.vino}</label>
              <select
                id={ids.vino}
                value={vinoId}
                onChange={(e) => setVinoId(e.target.value)}
                required
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{textos.eligeVino}</option>
                {grupos.map((g) => (
                  <optgroup key={g.tipo} label={g.etiqueta}>
                    {g.vinos.map((v) => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={ids.nombre} className="text-sm font-medium">{textos.nombre}</label>
              <Input id={ids.nombre} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" maxLength={80} required className="h-11 text-base" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={ids.contacto} className="text-sm font-medium">{textos.contacto}</label>
              <Input
                id={ids.contacto}
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                autoComplete="email"
                inputMode="email"
                maxLength={120}
                required
                aria-describedby={ids.ayuda}
                className="h-11 text-base"
              />
              <p id={ids.ayuda} className="text-xs text-muted-foreground">{textos.contactoAyuda}</p>
            </div>
            <div className="flex items-start gap-3">
              <input
                id={ids.bases}
                type="checkbox"
                checked={bases}
                onChange={(e) => setBases(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--accent))]"
              />
              {/* Enlaces en pestaña nueva: navegar aquí cerraría el diálogo y se perdería el voto. */}
              <label htmlFor={ids.bases} className="text-sm leading-snug text-muted-foreground">
                {textos.basesAntes}{" "}
                <a
                  href={`${construirRutaIdioma(CONDICIONES_PATH, language)}#${ANCLA_CONDICIONES_SORTEO}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  {textos.basesEnlace}
                  <span className="sr-only"> {textos.pestanaNueva}</span>
                </a>
                {textos.basesDespues}{" "}
                <a
                  href={construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  {textos.privacidad}
                  <span className="sr-only"> {textos.pestanaNueva}</span>
                </a>
              </label>
            </div>
            {error && <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={enviando} className="h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent-hover">
              {enviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{textos.enviando}</> : textos.enviar}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
