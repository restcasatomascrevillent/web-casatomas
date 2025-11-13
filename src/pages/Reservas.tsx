import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
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
  hora: z.string().min(1, "Selecciona una hora"),
});

type ReservaForm = z.infer<typeof reservaSchema>;

const Reservas = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReservaForm>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      nombre: "",
      telefono: "",
      email: "",
      comensales: "",
      sala: "",
      hora: "",
    },
  });

  const onSubmit = async (data: ReservaForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        comensales: parseInt(data.comensales),
        sala: data.sala,
        fecha: format(data.fecha, "yyyy-MM-dd", { locale: es }),
        hora: data.hora,
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

                  <FormField
                    control={form.control}
                    name="hora"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una hora" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="13:00">13:00</SelectItem>
                            <SelectItem value="13:30">13:30</SelectItem>
                            <SelectItem value="14:00">14:00</SelectItem>
                            <SelectItem value="14:30">14:30</SelectItem>
                            <SelectItem value="15:00">15:00</SelectItem>
                            <SelectItem value="20:00">20:00</SelectItem>
                            <SelectItem value="20:30">20:30</SelectItem>
                            <SelectItem value="21:00">21:00</SelectItem>
                            <SelectItem value="21:30">21:30</SelectItem>
                            <SelectItem value="22:00">22:00</SelectItem>
                            <SelectItem value="22:30">22:30</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
