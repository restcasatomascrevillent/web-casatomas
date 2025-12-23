import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Mail, Gift } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/i18n/LanguageProvider";

const ContactoSection = () => {
  const { t } = useTranslations();
  const [giftAmount, setGiftAmount] = useState("");
  const { toast } = useToast();

  const handleGiftPurchase = () => {
    if (!giftAmount || parseFloat(giftAmount) <= 0) {
      toast({
        title: t.contacto.toasts.errorTitle,
        description: t.contacto.toasts.errorDescription,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: t.contacto.toasts.giftTitle,
      description: t.contacto.toasts.giftDescription.replace("{amount}", giftAmount),
    });
  };

  return (
    <section id="contacto" className="py-20 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-muted to-background">
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
            {t.contacto.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
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
            initial={{ opacity: 0, x: -50 }}
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
                    <p className="text-sm text-muted-foreground">966 10 78 87</p>
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
            initial={{ opacity: 0, x: 50 }}
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
    </section>
  );
};

export default ContactoSection;
