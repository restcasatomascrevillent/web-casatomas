import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompraChequePasos } from "@/components/CompraChequePasos";
import { MapPin, Phone, Mail, Gift, PawPrint, Wine } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TelLink } from "@/components/TelLink";
import { AREA_TOQUE_EMAIL } from "@/lib/area-toque";
import { construirRutaIdioma } from "@/i18n/routing";
import { TIENDA_PATH } from "@/lib/condiciones";
import type { Language } from "@/i18n/types";
import { CHEQUES_REGALO_CREAR_URL, functionHeaders, leerCuerpo } from "@/lib/supabase-functions";

export interface DatosComprador {
  nombre: string;
  email: string;
  telefono: string;
  destinatario: string;
  mensaje: string;
  fechaEntrega: string;
  ocultarImporte: boolean;
  incluirDedicatoria: boolean;
}

const DATOS_COMPRADOR_VACIOS: DatosComprador = {
  nombre: "",
  email: "",
  telefono: "",
  destinatario: "",
  mensaje: "",
  fechaEntrega: "",
  ocultarImporte: false,
  incluirDedicatoria: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mismos límites que valida `cheques-regalo-web/crear` en el servidor. */
const IMPORTE_MIN = 10;
const IMPORTE_MAX = 1000;

/** Acceso a la tienda de vinos al pie de la tarjeta de cheques regalo. */
const ACCESO_TIENDA: Record<Language, { titulo: string; texto: string; boton: string }> = {
  es: { titulo: "Tienda de vinos", texto: "Llévate a casa los vinos de nuestra carta.", boton: "Ver la tienda" },
  en: { titulo: "Wine shop", texto: "Take home the wines from our wine list.", boton: "See the shop" },
  fr: { titulo: "Boutique de vins", texto: "Emportez chez vous les vins de notre carte.", boton: "Voir la boutique" },
};

const ContactoSection = ({ modo = "completo" }: { modo?: "completo" | "contacto" | "regalo" }) => {
  const { t, language } = useTranslations();
  // En la portada la sección cuelga de un h2; en /contacto y /regala solo hay el h1 de la página:
  // sus tarjetas llevan h2 (y el subtítulo h3) para no saltarse ningún nivel.
  const nivelTitulo = modo === "completo" ? "h3" : "h2";
  const SubTitulo = modo === "completo" ? "h4" : "h3";
  const [giftAmount, setGiftAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [datos, setDatos] = useState<DatosComprador>(DATOS_COMPRADOR_VACIOS);
  const [enviando, setEnviando] = useState(false);
  // `enviando` es estado y no corta un doble clic en el mismo instante (el
  // botón se deshabilita en el siguiente render): sin esto salían dos
  // peticiones, dos cheques pendientes y dos sesiones de Stripe.
  const enviandoRef = useRef(false);
  // Error del formulario DENTRO del diálogo, no un toast: el toast es
  // `fixed top-0` a todo el ancho en móvil (por encima del diálogo, que es
  // `z-50`), así que tapaba la cabecera y la "X" de cerrar justo cuando el
  // visitante más necesitaba verlas. Un error de esta fila es siempre
  // visible sin hacer scroll (va pegado a la cabecera fija).
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
  const { toast } = useToast();

  // Vuelta desde Stripe Checkout: `cheques-regalo-web` añade `#contacto` al
  // redirigir, así que esto se lee una vez montada la página con esa sección
  // ya a la vista. Se limpia la query de la URL para que un refresco no
  // repita el toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("cheque_regalo");
    if (!resultado) return;

    if (resultado === "exito") {
      toast({ title: t.contacto.toasts.giftSuccessTitle, description: t.contacto.toasts.giftSuccessDescription });
    } else if (resultado === "cancelado") {
      toast({ title: t.contacto.toasts.giftCancelTitle, description: t.contacto.toasts.giftCancelDescription });
    }

    params.delete("cheque_regalo");
    params.delete("session_id");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    // Solo debe correr al montar: es una lectura puntual de la URL con la que llegó la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGiftPurchase = () => {
    const importe = parseFloat(giftAmount);
    if (!giftAmount || !Number.isFinite(importe) || importe <= 0) {
      toast({
        title: t.contacto.toasts.errorTitle,
        description: t.contacto.toasts.errorDescription,
        variant: "destructive",
      });
      return;
    }
    // Antes solo se comprobaba > 0: con 5 € se rellenaba todo el formulario
    // y el servidor lo rechazaba al final.
    if (importe < IMPORTE_MIN || importe > IMPORTE_MAX) {
      toast({
        title: t.contacto.toasts.errorTitle,
        description: t.contacto.toasts.giftAmountRange,
        variant: "destructive",
      });
      return;
    }
    setDatos(DATOS_COMPRADOR_VACIOS);
    setErrorFormulario(null);
    setDialogOpen(true);
  };

  const handleConfirmarCompra = async () => {
    const nombre = datos.nombre.trim();
    const email = datos.email.trim();

    if (!nombre) {
      setErrorFormulario(t.contacto.toasts.giftMissingName);
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setErrorFormulario(t.contacto.toasts.giftInvalidEmail);
      return;
    }

    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setErrorFormulario(null);
    setEnviando(true);
    try {
      const response = await fetch(CHEQUES_REGALO_CREAR_URL, {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({
          // Sin factura: la web ya no la emite al comprar; se pide al canjear el cheque.
          importe_eur: parseFloat(giftAmount),
          comprador_nombre: nombre,
          comprador_email: email,
          comprador_telefono: datos.telefono.trim() || undefined,
          destinatario_nombre: datos.destinatario.trim() || undefined,
          ocultar_importe: datos.ocultarImporte,
          incluir_dedicatoria: datos.incluirDedicatoria,
          mensaje: datos.incluirDedicatoria ? datos.mensaje.trim() || undefined : undefined,
          fecha_entrega_deseada: datos.fechaEntrega || undefined,
        }),
      });
      const cuerpo = (await leerCuerpo(response)) as { url?: string; mensaje?: string; message?: string; ocultar_importe?: boolean } | null;

      if (!response.ok || !cuerpo?.url) {
        throw new Error(cuerpo?.mensaje || cuerpo?.message || `No se pudo abrir el pago (HTTP ${response.status}).`);
      }

      if (datos.ocultarImporte && cuerpo.ocultar_importe !== true) {
        throw new Error({ es: "No se pudo confirmar que el importe quede oculto. Inténtalo más tarde.", en: "Your hidden amount preference could not be confirmed. Please try again later.", fr: "Le masquage du montant n’a pas pu être confirmé. Réessayez plus tard." }[language || "es"]);
      }
      // Redirige a Stripe Checkout: no hay nada más que pintar en esta pestaña.
      window.location.href = cuerpo.url;
    } catch (error) {
      // Un fallo de red llega como TypeError de `fetch` ("Failed to fetch",
      // "Load failed"…): técnico y en inglés. Se cuenta con el texto propio.
      const propio = error instanceof Error && !(error instanceof TypeError) && error.message;
      setErrorFormulario(propio || `${t.contacto.toasts.giftPaymentErrorTitle}. ${t.contacto.toasts.giftPaymentErrorDescription}`);
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <section id="contacto" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-muted to-background">
      <motion.div
        initial={false}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        {modo === "completo" && <div className="text-center mb-12">
          <motion.h2
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-primary mb-4"
          >
            {t.contacto.title}
          </motion.h2>
          <motion.p
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-muted-foreground"
          >
            {t.contacto.subtitle}
          </motion.p>
        </div>}

        <div className={modo === "completo" ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "max-w-3xl mx-auto"}>
          {/* Contact information */}
          {modo !== "regalo" && <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle as={nivelTitulo}>{t.contacto.infoTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">{t.contacto.addressLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.contacto.addressLines.map((line, index) => (
                        <span key={line}>
                          {line}
                          {index < t.contacto.addressLines.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">{t.contacto.phoneLabel}</p>
                    <p className="text-sm">
                      <TelLink className="text-muted-foreground underline underline-offset-4 hover:text-accent hover:decoration-2 transition-colors" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">{t.contacto.emailLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      <a href="mailto:casatomascrevillent@gmail.com" className={`${AREA_TOQUE_EMAIL} underline underline-offset-2 hover:decoration-2`}>casatomascrevillent@gmail.com</a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <PawPrint className="w-5 h-5 text-accent flex-shrink-0 mt-1" aria-hidden="true" />
                  <div>
                    <p className="font-medium">{t.contacto.petsLabel}</p>
                    <p className="text-sm text-muted-foreground">{t.contacto.petsText}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle as={nivelTitulo}>{t.contacto.hoursTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {t.contacto.schedule.map((slot) => (
                  <div key={slot.day} className="flex justify-between">
                    <span className="font-medium">{slot.day}</span>
                    <span className="text-muted-foreground">{slot.hours}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>}

          {/* Regalar Experiencia */}
          {modo !== "contacto" && <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
              <CardHeader>
                <CardTitle as={nivelTitulo} className="flex items-center gap-2">
                  <Gift className="w-6 h-6 text-accent" />
                  {t.contacto.giftTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {t.contacto.giftDescription}
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label htmlFor="importe-cheque-regalo" className="text-sm font-medium mb-2 block">
                      {t.contacto.giftAmountLabel}
                    </label>
                    <Input
                      id="importe-cheque-regalo"
                      type="number"
                      inputMode="decimal"
                      placeholder={t.contacto.giftPlaceholder}
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(e.target.value)}
                      min={IMPORTE_MIN}
                      max={IMPORTE_MAX}
                      step="1"
                    />
                  </div>
                  
                  <Button
                    className="w-full bg-accent hover:bg-accent-hover"
                    onClick={handleGiftPurchase}
                  >
                    {t.contacto.giftButton}
                  </Button>
                </div>

                <div className="pt-4 border-t border-accent/20">
                  <SubTitulo className="font-medium mb-2">{t.contacto.giftSuggested}</SubTitulo>
                  <div className="grid grid-cols-3 gap-2">
                    {[50, 100, 150].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => setGiftAmount(amount.toString())}
                        className="border-accent/30 hover:bg-accent/10"
                      >
                        {amount}€
                      </Button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground pt-4">
                  {t.contacto.giftNote}
                </p>

                <div className="pt-4 border-t border-accent/20">
                  <SubTitulo className="font-medium mb-1 flex items-center gap-2">
                    <Wine className="w-4 h-4 shrink-0 text-accent" aria-hidden="true" />
                    {ACCESO_TIENDA[language].titulo}
                  </SubTitulo>
                  <p className="text-sm text-muted-foreground mb-3">{ACCESO_TIENDA[language].texto}</p>
                  {/* Mismo aspecto que los botones de importe de arriba. */}
                  <Button asChild variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2 border-accent/30 hover:bg-accent/10">
                    <Link to={construirRutaIdioma(TIENDA_PATH, language)}>{ACCESO_TIENDA[language].boton}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>}
        </div>
      </motion.div>

      <CompraChequePasos open={dialogOpen} onOpenChange={open => !enviando && setDialogOpen(open)}
        datos={datos} setDatos={setDatos} importe={giftAmount} enviando={enviando}
        error={errorFormulario} setError={setErrorFormulario} confirmar={handleConfirmarCompra} />
    </section>
  );
};

export default ContactoSection;

