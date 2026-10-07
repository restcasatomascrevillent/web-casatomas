import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n/LanguageProvider';
import { etiquetaTipoVino, TIPOS_VINO, tipoVino, type TipoVino } from '@/lib/tipos-vino';

interface Props {
  vinos: { categoria?: string | null }[];
  seleccionado: TipoVino | null;
  onChange: (tipo: TipoVino) => void;
}

export default function FiltrosTipoVino({ vinos, seleccionado, onChange }: Props) {
  const { language } = useTranslations();
  const grupos = { es: 'Filtrar vinos por tipo', en: 'Filter wines by type', fr: 'Filtrer les vins par type' };
  return (
    <div role="group" aria-label={grupos[language]} className="flex flex-wrap justify-center gap-2">
      {TIPOS_VINO.filter(tipo => tipo !== 'otro' && (tipo !== 'rosado' || vinos.some(vino => tipoVino(vino.categoria) === tipo))).map(tipo => {
        const cantidad = tipo === 'todos' ? vinos.length : vinos.filter(vino => tipoVino(vino.categoria) === tipo).length;
        return (
          <Button
            key={tipo}
            type="button"
            variant={seleccionado === tipo ? 'default' : 'outline'}
            aria-pressed={seleccionado === tipo}
            onClick={() => onChange(tipo)}
            className="min-h-11 h-auto rounded-full px-4 py-2 whitespace-normal text-center"
          >
            {etiquetaTipoVino(tipo, language)}
            <span aria-hidden="true" className="ml-2 rounded-full bg-foreground/10 px-2 text-xs">{cantidad}</span>
          </Button>
        );
      })}
    </div>
  );
}
