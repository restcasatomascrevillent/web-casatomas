import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Phone, Mail, Gift, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TelLink } from "@/components/TelLink";
import { CHEQUES_REGALO_CREAR_URL, functionHeaders, leerCuerpo } from "@/lib/supabase-functions";

interface DatosComprador {
  nombre: string;
  email: string;
  telefono: string;
  destinatario: string;
  mensaje: string;
  fechaEntrega: string;
}

const DATOS_COMPRADOR_VACIOS: DatosComprador = {
  nombre: "",
  email: "",
  telefono: "",
  destinatario: "",
  mensaje: "",
  fechaEntrega: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactoSection = () => {
  const { t } = useTranslations();
  const [giftAmount, setGiftAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [datos, setDatos] = useState<DatosComprador>(DATOS_COMPRADOR_VACIOS);
  const [enviando, setEnviando] = useState(false);
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
    if (!giftAmount || parseFloat(giftAmount) <= 0) {
      toast({
        title: t.contacto.toasts.errorTitle,
        description: t.contacto.toasts.errorDescription,
        variant: "destructive",
      });
      return;
    }
    setDatos(DATOS_COMPRADOR_VACIOS);
    setDialogOpen(true);
  };

  const handleConfirmarCompra = async () => {
    const nombre = datos.nombre.trim();
    const email = datos.email.trim();

    if (!nombre) {
      toast({ title: t.contacto.toasts.giftMissingName, variant: "destructive" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      toast({ title: t.contacto.toasts.giftInvalidEmail, variant: "destructive" });
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch(CHEQUES_REGALO_CREAR_URL, {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({
          importe_eur: parseFloat(giftAmount),
          comprador_nombre: nombre,
          comprador_email: email,
          comprador_telefono: datos.telefono.trim() || undefined,
          destinatario_nombre: datos.destinatario.trim() || undefined,
          mensaje: datos.mensaje.trim() || undefined,
          fecha_entrega_deseada: datos.fechaEntrega || undefined,
        }),
      });
      const cuerpo = (await leerCuerpo(response)) as { url?: string; mensaje?: string } | null;

      if (!response.ok || !cuerpo?.url) {
        throw new Error(cuerpo?.mensaje);
      }

      // Redirige a Stripe Checkout: no hay nada más que pintar en esta pestaña.
      window.location.href = cuerpo.url;
    } catch {
      toast({
        title: t.contacto.toasts.giftPaymentErrorTitle,
        description: t.contacto.toasts.giftPaymentErrorDescription,
        variant: "destructive",
      });
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
        <div className="text-center mb-12">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact information */}
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>{t.contacto.infoTitle}</CardTitle>
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
                      <TelLink className="text-muted-foreground underline-offset-4 hover:text-accent hover:underline transition-colors" />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">{t.contacto.emailLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      casatomascrevillent@gmail.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.contacto.hoursTitle}</CardTitle>
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
          </motion.div>

          {/* Regalar Experiencia */}
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                    <label className="text-sm font-medium mb-2 block">
                      {t.contacto.giftAmountLabel}
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder={t.contacto.giftPlaceholder}
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(e.target.value)}
                      min="1"
                      step="1"
                    />
                  </div>
                  
                  <Button
                    className="w-full bg-accent hover:bg-accent/90"
                    onClick={handleGiftPurchase}
                  >
                    {t.contacto.giftButton}
                  </Button>
                </div>

                <div className="pt-4 border-t border-accent/20">
                  <h4 className="font-medium mb-2">{t.contacto.giftSuggested}</h4>
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
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !enviando && setDialogOpen(open)}>
        <DialogContent className="w-[92vw] sm:max-w-md max-h-[88vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-8">{t.contacto.giftDialogTitle}</DialogTitle>
            <DialogDescription>{t.contacto.giftDialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm font-medium text-accent">
              {t.contacto.giftFormAmountSummary.replace("{amount}", giftAmount)}
            </p>

            <div className="space-y-2">
              <Label htmlFor="gift-buyer-name">{t.contacto.giftFormBuyerName}</Label>
              <Input
                id="gift-buyer-name"
                value={datos.nombre}
                onChange={(e) => setDatos((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder={t.contacto.giftFormBuyerNamePlaceholder}
                autoComplete="name"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-buyer-email">{t.contacto.giftFormBuyerEmail}</Label>
              <Input
                id="gift-buyer-email"
                type="email"
                inputMode="email"
                value={datos.email}
                onChange={(e) => setDatos((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={t.contacto.giftFormBuyerEmailPlaceholder}
                autoComplete="email"
                maxLength={320}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-buyer-phone">{t.contacto.giftFormBuyerPhone}</Label>
              <Input
                id="gift-buyer-phone"
                type="tel"
                inputMode="tel"
                value={datos.telefono}
                onChange={(e) => setDatos((prev) => ({ ...prev, telefono: e.target.value }))}
                placeholder={t.contacto.giftFormBuyerPhonePlaceholder}
                autoComplete="tel"
                maxLength={40}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-recipient-name">{t.contacto.giftFormRecipientName}</Label>
              <Input
                id="gift-recipient-name"
                value={datos.destinatario}
                onChange={(e) => setDatos((prev) => ({ ...prev, destinatario: e.target.value }))}
                placeholder={t.contacto.giftFormRecipientNamePlaceholder}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-message">{t.contacto.giftFormMessage}</Label>
              <Textarea
                id="gift-message"
                value={datos.mensaje}
                onChange={(e) => setDatos((prev) => ({ ...prev, mensaje: e.target.value }))}
                placeholder={t.contacto.giftFormMessagePlaceholder}
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gift-delivery-date">{t.contacto.giftFormDeliveryDate}</Label>
              <Input
                id="gift-delivery-date"
                type="date"
                value={datos.fechaEntrega}
                onChange={(e) => setDatos((prev) => ({ ...prev, fechaEntrega: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={enviando}>
              {t.contacto.giftFormCancel}
            </Button>
            <Button
              className="bg-accent hover:bg-accent/90"
              onClick={handleConfirmarCompra}
              disabled={enviando}
            >
              {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {enviando ? t.contacto.giftFormSubmitting : t.contacto.giftFormSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContactoSection;
