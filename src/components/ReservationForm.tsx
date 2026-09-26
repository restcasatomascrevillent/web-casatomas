import { Fragment, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createReservationSchema, type ReservationFormData } from "@/lib/validations";
import { formatearTelefonoWebhook } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertCircle, CalendarIcon, CheckCircle, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/LanguageProvider";
import { TelLink } from "@/components/TelLink";
import {
  RESERVAS_WEB_CREAR_URL,
  RESERVAS_WEB_DISPONIBILIDAD_URL,
  functionHeaders,
  leerCuerpo,
} from "@/lib/supabase-functions";
import {
  clasificarDisponibilidad,
  interpretarRechazoReserva,
  type DisponibilidadHueco,
  type RechazoReserva,
} from "@/lib/reservas-web";
import { leerComensalesReserva } from "@/lib/mi-mesa";

type ReservationFormProps = {
  onSuccessClose?: () => void;
  navigateOnClose?: boolean;
};

/**
 * Pinta la salida de un rechazo sustituyendo `{phone}` por el telefono
 * pulsable que ya usan el footer y la barra de CTA movil.
 */
const TextoSalida = ({ texto }: { texto: string }) => {
  const partes = texto.split("{phone}");
  return (
    <>
      {partes.map((parte, indice) => (
        <Fragment key={indice}>
          {parte}
          {indice < partes.length - 1 && (
            <TelLink className="font-medium text-primary underline underline-offset-2" />
          )}
        </Fragment>
      ))}
    </>
  );
};

export const ReservationForm = ({ onSuccessClose, navigateOnClose = true }: ReservationFormProps) => {
  const { t, dateLocale } = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadHueco[]>([]);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [rechazo, setRechazo] = useState<RechazoReserva | null>(null);
  const [reservationDetails, setReservationDetails] = useState<{
    fecha: Date;
    hora: string;
    comensales: number;
  } | null>(null);
  const navigate = useNavigate();

  const reservationSchema = useMemo(() => createReservationSchema(t.validation), [t]);

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      nombre: "",
      telefono: "+34 ",
      email: "",
      numero_comensales: 2,
      notas_cliente: "",
    },
  });

  const watchFecha = form.watch("fecha");

  // `?comensales=N` (lo manda "Reservar mesa para N" desde Mi mesa). Se lee
  // tras montar — en el prerender SSG no hay URL y el HTML debe coincidir con
  // la hidratación —: 1–12 rellena el campo; más de 12 no rellena nada y
  // enseña el aviso de grupos grandes por teléfono (la web los rechaza con
  // `grupo_grande`).
  const [grupoGrandeDesdeMesa, setGrupoGrandeDesdeMesa] = useState(false);
  useEffect(() => {
    const { comensales, grupoGrande } = leerComensalesReserva(window.location.search);
    if (comensales !== null) form.setValue("numero_comensales", comensales);
    setGrupoGrandeDesdeMesa(grupoGrande);
  }, [form]);

  /** Huecos agrupados por turno, en el mismo orden en que los manda el motor. */
  const huecosPorTurno = useMemo(
    () =>
      (["comida", "cena"] as const)
        .map((turno) => ({
          turno,
          huecos: disponibilidad.filter((hueco) => hueco.turno === turno),
        }))
        .filter((grupo) => grupo.huecos.length > 0),
    [disponibilidad],
  );

  const checkAvailability = async () => {
    const fecha = form.getValues("fecha");
    const numeroComensales = form.getValues("numero_comensales");

    if (!fecha || !numeroComensales) {
      toast.error(t.reservationForm.toasts.missingFields);
      return;
    }

    const mostrarErrorDisponibilidad = () => {
      setDisponibilidad([]);
      setHasCheckedAvailability(true);
      setSelectedHour(null);
      toast.error(t.reservationForm.toasts.availabilityErrorTitle, {
        description: t.reservationForm.toasts.availabilityErrorDescription,
      });
    };

    setIsCheckingAvailability(true);
    try {
      const response = await fetch(RESERVAS_WEB_DISPONIBILIDAD_URL, {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({
          fecha: format(fecha, "yyyy-MM-dd"),
          numero_comensales: numeroComensales,
        }),
      });

      // Hay que mirar `response.ok` ANTES de tocar el cuerpo: en 4xx/5xx la
      // funcion devuelve un OBJETO `{ ok:false, error }`, y recorrerlo como si
      // fuera el array de exito revienta con `.map is not a function`.
      const resultado = clasificarDisponibilidad(response.ok, await leerCuerpo(response));

      if (resultado.estado === "error") {
        console.error("Error checking availability: respuesta no valida", response.status);
        mostrarErrorDisponibilidad();
        return;
      }

      // Dia CERRADO: no es un fallo, es una respuesta valida que dice que ese
      // dia no se reserva. Hasta ahora los dos casos caian en el mismo toast.
      if (resultado.estado === "cerrado") {
        setDisponibilidad([]);
        setHasCheckedAvailability(true);
        setSelectedHour(null);
        toast.message(t.reservationForm.toasts.closedDay);
        return;
      }

      // El motor ya decidio que horas se ofrecen (`kind:"hueco"`) y con que
      // aforo: no se reconstruye nada aqui, se pinta tal cual llega y en el
      // mismo orden (el motor ya resuelve turnos que crucen medianoche).
      setDisponibilidad(resultado.huecos);
      setHasCheckedAvailability(true);
      setSelectedHour(null);
      toast.success(t.reservationForm.toasts.availabilityChecked);
    } catch (error) {
      console.error("Error checking availability:", error);
      toast.error(t.reservationForm.toasts.availabilityErrorTitle, {
        description: t.reservationForm.toasts.availabilityErrorDescription,
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const onSubmit = async (data: ReservationFormData) => {
    if (!selectedHour) {
      toast.error(t.reservationForm.toasts.missingTime);
      return;
    }

    if (honeypot) {
      console.log("Honeypot triggered, possible bot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const telefonoWebhook = formatearTelefonoWebhook(data.telefono);

      const response = await fetch(RESERVAS_WEB_CREAR_URL, {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({
          nombre: data.nombre,
          telefono: telefonoWebhook,
          email: data.email,
          fecha: format(data.fecha, "yyyy-MM-dd"),
          hora: selectedHour.slice(0, 5),
          numero_comensales: data.numero_comensales,
          notas_cliente: data.notas_cliente || "",
          estado: "pendiente"
        })
      });

      // El cuerpo se lee SIEMPRE, tambien en 4xx: ahi es donde viene el
      // `mensaje` que explica al visitante por que no ha entrado la reserva.
      // `if (!response.ok) throw` lo tiraba a la basura.
      const cuerpo = await leerCuerpo(response);

      // 201 es el UNICO 2xx de exito. Todo lo demas es un rechazo con motivo.
      if (response.status !== 201) {
        setRechazo(interpretarRechazoReserva(response.status, cuerpo, t.reservationForm.rejection));
        return;
      }

      setReservationDetails({
        fecha: data.fecha,
        hora: selectedHour.slice(0, 5),
        comensales: data.numero_comensales
      });
      setShowSuccessDialog(true);

      form.reset();
      setDisponibilidad([]);
      setSelectedHour(null);
      setHasCheckedAvailability(false);
    } catch (error) {
      // Ni siquiera hubo respuesta (red caida, CORS): se representa con
      // status 0 para que el mensaje sea el de "reintenta o llamanos".
      console.error("Error sending reservation:", error);
      setRechazo(interpretarRechazoReserva(0, null, t.reservationForm.rejection));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setDisponibilidad([]);
    setSelectedHour(null);
    setHasCheckedAvailability(false);
  }, [watchFecha]);

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    if (onSuccessClose) onSuccessClose();
    if (navigateOnClose) navigate("/");
  };

  const formattedSuccessDate = reservationDetails?.fecha
    ? format(reservationDetails.fecha, "PPP", { locale: dateLocale })
    : "";
  const successDateLine =
    reservationDetails && formattedSuccessDate
      ? t.reservationForm.successLine2
        .replace("{date}", formattedSuccessDate)
        .replace("{time}", reservationDetails.hora)
      : "";

  return (
    <>
      <Dialog open={showSuccessDialog} onOpenChange={handleCloseSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">{t.reservationForm.successTitle}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-base space-y-2">
                {reservationDetails && (
                  <>
                    <p>{t.reservationForm.successLine1.replace("{guests}", reservationDetails.comensales.toString())}</p>
                    <p>{successDateLine}</p>
                    <p className="text-muted-foreground mt-4">{t.reservationForm.successLine3}</p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={handleCloseSuccessDialog}
            className="w-full mt-4 bg-primary hover:bg-primary/90 rounded-full"
          >
            {t.reservationForm.successButton}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={rechazo !== null} onOpenChange={(abierto) => !abierto && setRechazo(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <DialogTitle className="text-2xl">{t.reservationForm.rejection.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-base space-y-2">
                {rechazo && (
                  <>
                    <p>{rechazo.mensaje}</p>
                    <p className="text-muted-foreground mt-4">
                      <TextoSalida texto={rechazo.salida} />
                    </p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => setRechazo(null)}
            className="w-full mt-4 bg-primary hover:bg-primary/90 rounded-full"
          >
            {t.reservationForm.rejection.close}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="bg-card text-card-foreground border border-border/60 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6 pb-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">{t.reservationForm.stepOne}</h3>

              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-foreground font-medium">{t.reservationForm.dateLabel}</FormLabel>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal rounded-xl border-border/50 bg-white hover:bg-secondary",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: dateLocale })
                              ) : (
                                <span>{t.reservationForm.datePlaceholder}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setCalendarOpen(false);
                            }}
                            disabled={(date) => date < new Date()}
                            locale={dateLocale}
                            initialFocus
                            className="pointer-events-auto rounded-xl"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="numero_comensales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">{t.reservationForm.guestsLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        className="rounded-xl border-border/50 bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {grupoGrandeDesdeMesa && (
              <p
                role="status"
                className="flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>
                  <TextoSalida texto={t.reservationForm.largeGroupNotice} />
                </span>
              </p>
            )}

            <Button
              type="button"
              size="lg"
              onClick={checkAvailability}
              disabled={!form.watch("fecha") || !form.watch("numero_comensales") || isCheckingAvailability}
              className="w-full h-auto py-4 bg-secondary text-foreground hover:bg-secondary/80 rounded-full text-base font-semibold shadow-sm transition-all"
            >
              {isCheckingAvailability ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" />
                  <span className="text-center leading-snug">{t.reservationForm.checkingAvailability}</span>
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5 shrink-0" />
                  <span className="text-center leading-snug">{t.reservationForm.checkAvailability}</span>
                </>
              )}
            </Button>

            {hasCheckedAvailability && (
              <div className="space-y-4 pb-6 border-b border-border/30">
                <h3 className="text-lg font-semibold text-foreground">{t.reservationForm.stepTwo}</h3>
                <FormLabel className="text-foreground font-medium block">
                  {t.reservationForm.timesLabel}
                </FormLabel>
                {huecosPorTurno.map(({ turno, huecos }) => (
                  <div key={turno} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {turno === "comida" ? t.reservationForm.lunchLabel : t.reservationForm.dinnerLabel}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {huecos.map((hueco) => {
                        // `estado` lo decide el motor: "completo" se pinta en
                        // gris (le dice al cliente que esa hora existe pero no
                        // cabe) en vez de desaparecer sin explicacion.
                        const isCompleto = hueco.estado === "completo";

                        const occupancyColor = isCompleto
                          ? "border-red-500 bg-red-50 opacity-60 cursor-not-allowed"
                          : hueco.porcentaje_ocupacion < 50 ? "border-green-500 bg-green-50 hover:bg-green-100" :
                            hueco.porcentaje_ocupacion < 70 ? "border-yellow-500 bg-yellow-50 hover:bg-yellow-100" :
                              "border-orange-500 bg-orange-50 hover:bg-orange-100";

                        return (
                          <button
                            key={hueco.hora}
                            type="button"
                            onClick={() => !isCompleto && setSelectedHour(hueco.hora)}
                            disabled={isCompleto}
                            className={cn(
                              "p-4 rounded-xl border-2 text-center transition-all duration-200",
                              isCompleto ? "" : "cursor-pointer hover:scale-105 shadow-sm hover:shadow-md",
                              selectedHour === hueco.hora && !isCompleto
                                ? "border-primary bg-primary text-white scale-105 shadow-lg"
                                : occupancyColor
                            )}
                          >
                            <span className={cn(
                              "text-lg font-bold block",
                              selectedHour === hueco.hora && !isCompleto ? "text-white" : "text-foreground"
                            )}>
                              {hueco.hora.slice(0, 5)}
                            </span>
                            {isCompleto && (
                              <span className="text-xs text-red-600 font-medium">{t.reservationForm.fullLabel}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">
                {hasCheckedAvailability ? t.reservationForm.stepThree : t.reservationForm.infoTitle}
              </h3>

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">{t.reservationForm.nameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.reservationForm.namePlaceholder} {...field} className="rounded-xl border-border/50 bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">{t.reservationForm.phoneLabel}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder="+34 612345678"
                          {...field}
                          className="rounded-xl border-border/50 bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">{t.reservationForm.emailLabel}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t.reservationForm.emailPlaceholder} {...field} className="rounded-xl border-border/50 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notas_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">{t.reservationForm.notesLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.reservationForm.notesPlaceholder}
                        className="resize-none rounded-xl border-border/50 bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-lg py-6 rounded-full shadow-md hover:shadow-lg transition-all"
              disabled={isSubmitting || !selectedHour}
            >
              {isSubmitting ? t.reservationForm.submitting : t.reservationForm.submit}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t.reservationForm.footer}
            </p>
          </form>
        </Form>
      </div>
    </>
  );
};

export default ReservationForm;
