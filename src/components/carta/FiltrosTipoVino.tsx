import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n/LanguageProvider';
import { etiquetaTipoVino, TIPOS_VINO, tipoVino, type TipoVino } from '@/lib/tipos-vino';
import { cn } from '@/lib/utils';

interface Props {
  vinos: { categoria?: string | null }[];
  seleccionado: TipoVino | null;
  onChange: (tipo: TipoVino) => void;
}

const etiquetasCortas = {
  es: { todos: 'Todos', tinto: 'Tintos', blanco: 'Blancos', espumoso: 'Espumosos', rosado: 'Rosados', otro: 'Otros' },
  en: { todos: 'All', tinto: 'Reds', blanco: 'Whites', espumoso: 'Sparkling', rosado: 'Rosé', otro: 'Others' },
  fr: { todos: 'Tous', tinto: 'Rouges', blanco: 'Blancs', espumoso: 'Bulles', rosado: 'Rosés', otro: 'Autres' },
};

export default function FiltrosTipoVino({ vinos, seleccionado, onChange }: Props) {
  const { language } = useTranslations();
  const grupos = { es: 'Filtrar vinos por tipo', en: 'Filter wines by type', fr: 'Filtrer les vins par type' };
  const cantidades = vinos.reduce<Partial<Record<TipoVino, number>>>((total, vino) => {
    const tipo = tipoVino(vino.categoria);
    total[tipo] = (total[tipo] ?? 0) + 1;
    return total;
  }, { todos: vinos.length });
  const tipos = TIPOS_VINO.filter(tipo => tipo !== 'otro' && (tipo !== 'rosado' || cantidades.rosado));
  const conRosados = tipos.length === 5;
  return (
    <div role="group" aria-label={grupos[language]} className={cn(
      'mx-auto grid w-full max-w-2xl gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1.5',
      conRosados ? 'grid-cols-6 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4',
    )}>
      {tipos.map((tipo, i) => {
        const activo = seleccionado === tipo;
        const etiqueta = etiquetaTipoVino(tipo, language);
        return (
          <Button
            key={tipo}
            type="button"
            variant="ghost"
            aria-label={etiqueta}
            title={etiqueta}
            aria-pressed={activo}
            onClick={() => onChange(tipo)}
            className={cn(
              'h-11 min-w-0 justify-between gap-1.5 rounded-lg border px-2.5 py-0 font-sans text-xs font-medium tracking-normal hover:text-foreground sm:text-sm',
              conRosados && (i < 3 ? 'col-span-2 sm:col-span-1' : 'col-span-3 sm:col-span-1'),
              activo ? 'border-accent/30 bg-background text-foreground shadow-sm hover:bg-background' : 'border-transparent text-muted-foreground hover:bg-background/70',
            )}
          >
            <span className={cn('min-w-0', activo && 'font-semibold')}>{etiquetasCortas[language][tipo]}</span>
            <span aria-hidden="true" className={cn('shrink-0 text-[11px] tabular-nums sm:text-xs', activo ? 'font-semibold text-foreground' : 'text-muted-foreground/80')}>{cantidades[tipo] ?? 0}</span>
          </Button>
        );
      })}
    </div>
  );
}
