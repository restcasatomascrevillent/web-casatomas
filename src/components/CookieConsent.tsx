import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";

const CookieConsent = () => {
  const { t } = useTranslations();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <Card className="max-w-4xl mx-auto p-6 shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-shrink-0">
                <Cookie className="w-8 h-8 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{t.cookie.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.cookie.message}{" "}
                  <a href="/politica-privacidad" className="text-primary hover:underline font-medium">
                    {t.cookie.link}
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Button
                  onClick={handleReject}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {t.cookie.reject}
                </Button>
                <Button
                  onClick={handleAccept}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {t.cookie.accept}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
