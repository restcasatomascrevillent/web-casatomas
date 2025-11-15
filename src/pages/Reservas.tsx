import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const reservaSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  telefono: z.string().min(9, "El teléfono debe tener al menos 9 dígitos").max(20),
  email: z.string().email("Email inválido").max(255),
  comensales: z.string().min(1, "Número de comensales requerido"),
  sala: z.string().min(1, "Selecciona una sala"),
  fecha: z.date({
    required_error: "Selecciona una fecha",
  }),
});

type ReservaForm = z.infer<typeof reservaSchema>;

const Reservas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availableHours, setAvailableHours] = useState<string[]>([]);
  const [selectedHour, setSelectedHour] = useState<string>("");

  const form = useForm<ReservaForm>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      nombre: "",
      email: "",
      comensales: "",
      sala: "",
    },
  });

  const onSubmit = async (data: ReservaForm) => {
    
    if (!selectedHour) {
      toast({
        title: "Selecciona una hora",
        description: "Primero debes consultar disponibilidad y seleccionar una hora.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        comensales: parseInt(data.comensales),
        sala: data.sala,
        fecha: format(data.fecha, "yyyy-MM-dd", { locale: es }),
        hora: selectedHour,
      };

      const response = await fetch(
        "https://n8npersonal.miguelbenito.space/webhook-test/63431fb4-51b4-4f0b-8d48-2d1713dc418e",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Error al enviar la reserva");
      }

      toast({
        title: "Reserva enviada",
        description: "Recibirás una confirmación por email en breve.",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la reserva. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkAvailability = async () => {
    const sala = form.getValues("sala");
    const fecha = form.getValues("fecha");

    if (!sala) {
      toast({
        title: "Selecciona una sala",
        description: "Primero debes seleccionar una sala para consultar disponibilidad.",
        variant: "destructive",
      });
      return;
    }

    if (!fecha) {
      toast({
        title: "Selecciona una fecha",
        description: "Primero debes seleccionar una fecha para consultar disponibilidad.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingAvailability(true);
    setAvailableHours([]);
    setSelectedHour("");
    
    try {
      const fechaStr = format(fecha, "yyyy-MM-dd", { locale: es });
      const response = await fetch(
        `https://oficiososia.app.n8n.cloud/webhook-test/7e7fae99-44b9-48fd-b4d8-52be8cf0a518?sala=${encodeURIComponent(sala)}&fecha=${encodeURIComponent(fechaStr)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Error al consultar disponibilidad");
      }

      const data = await response.json();
      
      // Filtrar por la sala seleccionada y extraer las horas únicas
      if (Array.isArray(data) && data.length > 0) {
        const horasDisponibles = data
          .filter((slot: any) => slot.espacio.toLowerCase() === sala.toLowerCase())
          .map((slot: any) => slot.hora.substring(0, 5)) // Extraer HH:MM
          .filter((hora: string, index: number, self: string[]) => self.indexOf(hora) === index); // Únicas
        
        if (horasDisponibles.length > 0) {
          setAvailableHours(horasDisponibles);
          toast({
            title: "Disponibilidad consultada",
            description: `Se encontraron ${horasDisponibles.length} horarios disponibles.`,
          });
        } else {
          setAvailableHours([]);
          toast({
            title: "Sin disponibilidad",
            description: "No hay horarios disponibles para la fecha y sala seleccionadas.",
            variant: "destructive",
          });
        }
      } else {
        setAvailableHours([]);
        toast({
          title: "Sin disponibilidad",
          description: "No hay horarios disponibles para la fecha y sala seleccionadas.",
          variant: "destructive",
        });
      }
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-slate to-primary">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 text-background hover:text-background/80"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="bg-background/95 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">
                Reserva tu Mesa
              </CardTitle>
              <CardDescription className="text-center">
                Completa el formulario y recibirás una confirmación por email.
                Cualquier actualización también se enviará por el mismo canal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="666 123 456" {...field} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="tu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comensales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de comensales</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" placeholder="2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sala"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferencia de sala</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una sala" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="terraza">Terraza</SelectItem>
                            <SelectItem value="comedor">Comedor</SelectItem>
                            <SelectItem value="salon">Salón</SelectItem>
                            <SelectItem value="restaurante_exterior">Restaurante Exterior</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fecha"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: es })
                                ) : (
                                  <span>Selecciona una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={checkAvailability}
                      disabled={isCheckingAvailability}
                    >
                      {isCheckingAvailability ? (
                        "Consultando..."
                      ) : (
                        <>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Consultar Disponibilidad
                        </>
                      )}
                    </Button>

                    {availableHours.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <h3 className="font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Horas Disponibles
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {availableHours.map((hora) => (
                            <button
                              key={hora}
                              type="button"
                              onClick={() => setSelectedHour(hora)}
                              className={cn(
                                "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                                selectedHour === hora
                                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                                  : "border-border hover:border-primary hover:bg-accent"
                              )}
                            >
                              {hora}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Reserva
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Reservas;
