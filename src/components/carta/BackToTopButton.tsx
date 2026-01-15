import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";

type BackToTopButtonProps = {
  targetRef: React.RefObject<HTMLElement>;
  containerRef: React.RefObject<HTMLElement>;
};

const BackToTopButton = ({ targetRef, containerRef }: BackToTopButtonProps) => {
  const { t } = useTranslations();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const show = rect.top < -40 && rect.bottom > window.innerHeight * 0.4;
      setVisible(show);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-4 md:left-6 z-40">
      <Button
        className="shadow-lg rounded-full px-4 py-3 flex items-center gap-2 border transition-colors"
        style={{
          backgroundColor: "hsl(var(--dark-slate))",
          color: "hsl(var(--gold))",
          borderColor: "transparent",
        }}
        onClick={() => targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        <ArrowUp className="h-4 w-4" />
        <span className="text-sm font-semibold">{t.carta.backToTop}</span>
      </Button>
    </div>
  );
};

export default BackToTopButton;
