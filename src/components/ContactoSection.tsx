import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Mail, Gift } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ContactoSection = () => {
  const [giftAmount, setGiftAmount] = useState("");
  const { toast } = useToast();

  const handleGiftPurchase = () => {
    if (!giftAmount || parseFloat(giftAmount) <= 0) {
      toast({
        title: "Error",
        description: "Por favor, introduce una cantidad válida",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Ticket Regalo",
      description: `Procesando ticket de ${giftAmount}€. Contacta con nosotros para completar la compra.`,
    });
  };

  return (
    <section className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-muted to-background">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto"
      >
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-primary mb-4"
          >
            Contacto
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-lg text-muted-foreground"
          >
            Estamos aquí para atenderte
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Información de Contacto */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Dirección</p>
                    <p className="text-sm text-muted-foreground">
                      Carrer Santa Maria de la Cabeza, 2<br />
                      03330 Crevillent, Alicante<br />
                      España
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <p className="text-sm text-muted-foreground">966 10 78 87</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      casatomascrevillent@gmail.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Lunes</span>
                  <span className="text-muted-foreground">Cerrado</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Martes - Jueves</span>
                  <span className="text-muted-foreground">09:30 - 23:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Viernes</span>
                  <span className="text-muted-foreground">09:00 - 23:30</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Sábado</span>
                  <span className="text-muted-foreground">10:30 - 23:30</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Domingo</span>
                  <span className="text-muted-foreground">11:00 - 16:00</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Regalar Experiencia */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="h-full bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-6 h-6 text-accent" />
                  Regala una Experiencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Sorprende a tus seres queridos con un ticket regalo de Casa Tomás. 
                  Una experiencia gastronómica inolvidable.
                </p>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Importe del Ticket (€)
                    </label>
                    <Input
                      type="number"
                      placeholder="50"
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
                    Comprar Ticket Regalo
                  </Button>
                </div>

                <div className="pt-4 border-t border-accent/20">
                  <h4 className="font-medium mb-2">Tickets Sugeridos</h4>
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
                  * Los tickets regalo son válidos durante 12 meses desde la fecha de compra
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default ContactoSection;
