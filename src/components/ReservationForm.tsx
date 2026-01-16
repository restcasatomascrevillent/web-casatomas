import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createReservationSchema, type ReservationFormData } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarIcon, CheckCircle, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/LanguageProvider";

interface DisponibilidadSlot {
  fecha: string;
  hora: string;
  espacio_id: string;
  espacio: string;
  total_mesas_reservadas: number;
  total_comensales: number;
  total_reservas: number;
  total_mesas_espacio: number;
  capacidad_maxima: number;
  capacidad_disponible: number;
  porcentaje_ocupacion: number;
  nombre_periodo?: string;
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_base_minutos?: number;
  umbral_apertura_secundario?: number;
  dias_semana?: number[];
  activo?: boolean;
  ocultar_primario_si_secundario?: boolean;
}

type ReservationFormProps = {
  onSuccessClose?: () => void;
  navigateOnClose?: boolean;
};

export const ReservationForm = ({ onSuccessClose, navigateOnClose = true }: ReservationFormProps) => {
  const { t, dateLocale } = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadSlot[]>([]);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [reservationDetails, setReservationDetails] = useState<{
    fecha: Date;
    hora: string;
    comensales: number;
  } | null>(null);
  const navigate = useNavigate();

  const { data: salas } = useQuery({
    queryKey: ["espacios-reservas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("espacios_reserva")
        .select("*")
        .eq("activa", true)
        .order("nombre");

      if (error) throw error;
      return data || [];
    },
  });

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
  const watchSalaId = form.watch("sala_id");

  const normalizeSlots = (slots: DisponibilidadSlot[]) =>
    slots.map((slot) => ({
      ...slot,
      capacidad_disponible: Number(slot.capacidad_disponible ?? 0),
      capacidad_maxima: Number(slot.capacidad_maxima ?? 0),
      porcentaje_ocupacion: Number(slot.porcentaje_ocupacion ?? 0),
      total_comensales: Number(slot.total_comensales ?? 0),
      total_mesas_reservadas: Number(slot.total_mesas_reservadas ?? 0),
      total_reservas: Number(slot.total_reservas ?? 0),
      total_mesas_espacio: Number(slot.total_mesas_espacio ?? 0),
      intervalo_base_minutos: Number(slot.intervalo_base_minutos ?? 0),
      umbral_apertura_secundario: Number(slot.umbral_apertura_secundario ?? 0),
    }));

  const isAvailabilitySlot = (item: DisponibilidadSlot) =>
    typeof item.hora === "string" && typeof item.fecha === "string";

  const isPeriodoConfig = (item: DisponibilidadSlot) =>
    typeof item.hora_inicio === "string" && typeof item.hora_fin === "string";

  const normalizeHora = (hora: string) => {
    const match = hora.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return hora;
    const [, hours, minutes, seconds] = match;
    return `${hours}:${minutes}:${seconds ?? "00"}`;
  };

  const toMinutes = (hora: string) => {
    const [hours, minutes] = normalizeHora(hora).split(":").map(Number);
    return hours * 60 + minutes;
  };

  const formatMinutes = (minutes: number) => {
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
    const hoursValue = Math.floor(normalizedMinutes / 60);
    const minutesValue = normalizedMinutes % 60;
    return `${hoursValue.toString().padStart(2, "0")}:${minutesValue.toString().padStart(2, "0")}:00`;
  };

  const addMinutes = (hora: string, minutesToAdd: number) => formatMinutes(toMinutes(hora) + minutesToAdd);

  const buildSlotsBetween = (horaInicio: string, horaFin: string, intervalo: number) => {
    const slots: string[] = [];
    const start = toMinutes(horaInicio);
    const endRaw = toMinutes(horaFin);
    const end = endRaw <= start ? endRaw + 1440 : endRaw;
    for (let minutes = start; minutes < end; minutes += intervalo) {
      slots.push(formatMinutes(minutes));
    }
    return slots;
  };

  const isWithinPeriodo = (hora: string, periodo: DisponibilidadSlot) => {
    if (!periodo.hora_inicio || !periodo.hora_fin) return false;
    const start = toMinutes(periodo.hora_inicio);
    const endRaw = toMinutes(periodo.hora_fin);
    const end = endRaw <= start ? endRaw + 1440 : endRaw;
    let value = toMinutes(hora);
    if (value < start) {
      value += 1440;
    }
    return value >= start && value < end;
  };

  const checkAvailability = async () => {
    const fecha = form.getValues("fecha");
    const salaId = form.getValues("sala_id");
    const numeroComensales = form.getValues("numero_comensales");
    
    if (!fecha || !salaId || !numeroComensales) {
      toast.error(t.reservationForm.toasts.missingFields);
      return;
    }
    
    setIsCheckingAvailability(true);
    try {
      const response = await fetch(
        "https://n8npersonal.miguelbenito.space/webhook/7e7fae99-44b9-48fd-b4d8-52be8cf0a518",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fecha: format(fecha, "yyyy-MM-dd"),
            sala_id: salaId,
            numero_comensales: numeroComensales
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      const salaSeleccionada = salas?.find(s => s.id === salaId);
      if (!salaSeleccionada) {
        toast.error(t.reservationForm.toasts.missingRoom);
        return;
      }

      if (!text || text.trim() === '') {
        throw new Error("Empty availability response");
      }
      
      const rawData: DisponibilidadSlot[] = JSON.parse(text);
      const normalizedData = normalizeSlots(rawData);
      const slotsConOcupacion = normalizedData.filter(
        (slot) => isAvailabilitySlot(slot) && slot.espacio_id === salaId
      );
      const periodos = normalizedData.filter((slot) =>
        isPeriodoConfig(slot) && (slot.espacio_id === null || slot.espacio_id === salaId)
      );
      const diaSolicitado = fecha.getDay();

      const periodosActivos = periodos.filter((periodo) => periodo.activo !== false);
      const periodosAplicables =
        periodosActivos.length > 0
          ? periodosActivos.filter((periodo) => {
              const dias = periodo.dias_semana ?? [];
              return dias.length === 0 || dias.includes(diaSolicitado);
            })
          : [];

      if (periodosActivos.length > 0 && periodosAplicables.length === 0) {
        setDisponibilidad([]);
        setHasCheckedAvailability(true);
        setSelectedHour(null);
        toast.message(t.reservationForm.toasts.closedDay);
        return;
      }
      
      const occupationMap = new Map<string, DisponibilidadSlot>();
      slotsConOcupacion.forEach(slot => {
        occupationMap.set(normalizeHora(slot.hora), slot);
      });
      
      const configByHora = new Map<string, DisponibilidadSlot>();
      const horariosConfigurados =
        periodosAplicables.length > 0
          ? periodosAplicables.flatMap((periodo) => {
              const intervalo = Number(periodo.intervalo_base_minutos ?? 0);
              if (!periodo.hora_inicio || !periodo.hora_fin || intervalo <= 0) {
                return [];
              }
              return buildSlotsBetween(periodo.hora_inicio, periodo.hora_fin, intervalo).map((hora) => {
                const normalizedHora = normalizeHora(hora);
                if (!configByHora.has(normalizedHora)) {
                  configByHora.set(normalizedHora, periodo);
                }
                return normalizedHora;
              });
            })
          : [];

      if (horariosConfigurados.length === 0) {
        setDisponibilidad([]);
        setHasCheckedAvailability(true);
        setSelectedHour(null);
        toast.error(t.reservationForm.toasts.availabilityErrorTitle, {
          description: t.reservationForm.toasts.availabilityErrorDescription,
        });
        return;
      }

      const baseHorarios = horariosConfigurados;
      const horariosConOcupacion = slotsConOcupacion.map((slot) => normalizeHora(slot.hora));
      const baseHorariosSet = new Set<string>([...baseHorarios, ...horariosConOcupacion]);

      const createEmptySlot = (hora: string): DisponibilidadSlot => ({
        fecha: format(fecha, "yyyy-MM-dd"),
        hora,
        espacio_id: salaId,
        espacio: salaSeleccionada.nombre,
        total_mesas_reservadas: 0,
        total_comensales: 0,
        total_reservas: 0,
        total_mesas_espacio: salaSeleccionada.capacidad_maxima,
        capacidad_maxima: salaSeleccionada.capacidad_maxima,
        capacidad_disponible: salaSeleccionada.capacidad_maxima,
        porcentaje_ocupacion: 0
      });

      const allSlotsMap = new Map<string, DisponibilidadSlot>();
      baseHorariosSet.forEach((hora) => {
        const normalizedHora = normalizeHora(hora);
        const existingSlot = occupationMap.get(normalizedHora);
        allSlotsMap.set(normalizedHora, existingSlot ?? createEmptySlot(normalizedHora));
      });

      const hiddenTimes = new Set<string>();

      const secondaryOffsets = [15, 45];

      slotsConOcupacion.forEach((slot) => {
        const horaNormalizada = normalizeHora(slot.hora);
        if (!configByHora.has(horaNormalizada)) {
          const periodo = periodosAplicables.find((config) => isWithinPeriodo(horaNormalizada, config));
          if (periodo) {
            configByHora.set(horaNormalizada, periodo);
          }
        }
      });

      allSlotsMap.forEach((slot) => {
        const slotConfig = configByHora.get(normalizeHora(slot.hora));
        const umbralSecundario = Number(slotConfig?.umbral_apertura_secundario ?? 0);
        const ocultarPrimario = Boolean(slotConfig?.ocultar_primario_si_secundario);
        if (umbralSecundario > 0 && Number(slot.porcentaje_ocupacion) > umbralSecundario) {
          secondaryOffsets.forEach((offsetMinutes) => {
            const secondaryHora = normalizeHora(addMinutes(slot.hora, offsetMinutes));
            if (slotConfig && !isWithinPeriodo(secondaryHora, slotConfig)) {
              return;
            }
            const existingSecondary = occupationMap.get(secondaryHora);
            if (slotConfig && !configByHora.has(secondaryHora)) {
              configByHora.set(secondaryHora, slotConfig);
            }
            if (!allSlotsMap.has(secondaryHora)) {
              allSlotsMap.set(secondaryHora, existingSecondary ?? createEmptySlot(secondaryHora));
            }
          });
          if (ocultarPrimario && slot.hora.endsWith(":00:00")) {
            hiddenTimes.add(normalizeHora(slot.hora));
          }
        }
      });

      const allSlots = Array.from(allSlotsMap.values())
        .filter((slot) => !hiddenTimes.has(normalizeHora(slot.hora)))
        .sort((a, b) => toMinutes(a.hora) - toMinutes(b.hora));
      
      setDisponibilidad(normalizeSlots(allSlots));
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
      const salaSeleccionada = salas?.find(s => s.id === data.sala_id);
      const telefonoNormalizado = data.telefono.replace(/\s+/g, "");
      const telefonoWebhook = telefonoNormalizado.startsWith("+34")
        ? `+34${telefonoNormalizado.replace(/^\+34/, "")}`
        : telefonoNormalizado;
      
      const response = await fetch("https://n8npersonal.miguelbenito.space/webhook/2c6ec220-85c7-4460-b876-a92515c7b135", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: data.nombre,
          telefono: telefonoWebhook,
          email: data.email,
          fecha: format(data.fecha, "yyyy-MM-dd"),
          hora: selectedHour.slice(0, 5),
          numero_comensales: data.numero_comensales,
          sala: salaSeleccionada?.nombre || t.reservationForm.roomNotSpecified,
          sala_id: data.sala_id,
          notas_cliente: data.notas_cliente || "",
          estado: "pendiente"
        })
      });

      if (!response.ok) {
        throw new Error("Reservation processing error");
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
    } catch (error: any) {
      toast.error(t.reservationForm.toasts.submitErrorTitle, {
        description: t.reservationForm.toasts.submitErrorDescription,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setDisponibilidad([]);
    setSelectedHour(null);
    setHasCheckedAvailability(false);
  }, [watchFecha, watchSalaId]);

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
            <DialogTitle className="text-2xl font-serif">{t.reservationForm.successTitle}</DialogTitle>
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

                  <FormField
                    control={form.control}
                    name="sala_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">{t.reservationForm.roomLabel}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-2 border-border hover:border-primary transition-all rounded-xl bg-white">
                              <SelectValue placeholder={t.reservationForm.roomPlaceholder} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white border-2 border-border shadow-xl z-50 max-h-[300px] rounded-xl">
                            {salas?.map((sala) => (
                              <SelectItem 
                                key={sala.id} 
                                value={sala.id}
                                className="cursor-pointer py-2.5 px-3 hover:bg-primary/10 hover:text-primary transition-all font-medium"
                              >
                                {sala.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

              <Button
                type="button"
                onClick={checkAvailability}
                disabled={!form.watch("fecha") || !form.watch("sala_id") || !form.watch("numero_comensales") || isCheckingAvailability}
                className="w-full bg-secondary text-foreground hover:bg-secondary/80 rounded-full"
              >
                  {isCheckingAvailability ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.reservationForm.checkingAvailability}
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      {t.reservationForm.checkAvailability}
                    </>
                  )}
                </Button>

              {hasCheckedAvailability && (
                <div className="space-y-4 pb-6 border-b border-border/30">
                  <h3 className="text-lg font-semibold text-foreground">{t.reservationForm.stepTwo}</h3>
                  <FormLabel className="text-foreground font-medium block">
                    {t.reservationForm.timesLabel}
                  </FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {disponibilidad.map((slot) => {
                      const numeroComensales = Number(form.getValues("numero_comensales") || 0);
                      const capacidadDisponible = Number(slot.capacidad_disponible || 0);
                      const isCompleto = capacidadDisponible < numeroComensales;
                      
                      const occupancyColor = isCompleto 
                        ? "border-red-500 bg-red-50 opacity-60 cursor-not-allowed"
                        : slot.porcentaje_ocupacion < 50 ? "border-green-500 bg-green-50 hover:bg-green-100" :
                          slot.porcentaje_ocupacion < 70 ? "border-yellow-500 bg-yellow-50 hover:bg-yellow-100" :
                          "border-orange-500 bg-orange-50 hover:bg-orange-100";
                      
                      return (
                        <button
                          key={slot.hora}
                          type="button"
                          onClick={() => !isCompleto && setSelectedHour(slot.hora)}
                          disabled={isCompleto}
                          className={cn(
                            "p-4 rounded-xl border-2 text-center transition-all duration-200",
                            isCompleto ? "" : "cursor-pointer hover:scale-105 shadow-sm hover:shadow-md",
                            selectedHour === slot.hora && !isCompleto
                              ? "border-primary bg-primary text-white scale-105 shadow-lg"
                              : occupancyColor
                          )}
                        >
                          <span className={cn(
                            "text-lg font-bold block",
                            selectedHour === slot.hora && !isCompleto ? "text-white" : "text-foreground"
                          )}>
                            {slot.hora.slice(0, 5)}
                          </span>
                          {isCompleto && (
                            <span className="text-xs text-red-600 font-medium">{t.reservationForm.fullLabel}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
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
