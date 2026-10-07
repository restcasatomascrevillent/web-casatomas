import { WheatOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/i18n/LanguageProvider';

export default function OpcionSinGluten() {
  const { language } = useTranslations();
  const etiquetas = { es: 'Se puede hacer sin gluten', en: 'Can be made gluten-free', fr: 'Peut être préparé sans gluten' };
  return (
    <Badge variant="outline" className="gap-1.5 whitespace-normal border-emerald-600/30 bg-emerald-50 text-emerald-800">
      <WheatOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {etiquetas[language]}
    </Badge>
  );
}
