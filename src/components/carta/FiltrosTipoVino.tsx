import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const carril = useRef<HTMLDivElement>(null);
  const [bordes, setBordes] = useState({ izquierda: false, derecha: false });
  const medir = useCallback(() => {
    const el = carril.current;
    if (!el) return;
    const izquierda = el.scrollLeft > 2;
    const derecha = el.scrollWidth - el.clientWidth - Math.max(0, el.scrollLeft) > 2;
    setBordes(actual => actual.izquierda === izquierda && actual.derecha === derecha ? actual : { izquierda, derecha });
  }, []);
  useEffect(() => {
    medir();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    if (carril.current) observer?.observe(carril.current);
    window.addEventListener('resize', medir);
    return () => { observer?.disconnect(); window.removeEventListener('resize', medir); };
  }, [medir, vinos, language]);
  const desplazar = (direccion: number) => {
    const el = carril.current;
    if (!el) return;
    el.scrollBy({ left: direccion * Math.max(120, el.clientWidth * .7),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const desplazamiento = {
    es: { anterior: 'Ver tipos de vino anteriores', siguiente: 'Ver más tipos de vino' },
    en: { anterior: 'Show previous wine types', siguiente: 'Show more wine types' },
    fr: { anterior: 'Voir les types de vin précédents', siguiente: 'Voir plus de types de vin' },
  }[language];
  const grupos = { es: 'Filtrar vinos por tipo', en: 'Filter wines by type', fr: 'Filtrer les vins par type' };
  const cantidades = vinos.reduce<Partial<Record<TipoVino, number>>>((total, vino) => {
    const tipo = tipoVino(vino.categoria);
    total[tipo] = (total[tipo] ?? 0) + 1;
    return total;
  }, { todos: vinos.length });
  const tipos = TIPOS_VINO.filter(tipo => tipo !== 'otro' && (tipo !== 'rosado' || cantidades.rosado));
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-full sm:w-fit">
    <div ref={carril} onScroll={medir} role="group" aria-label={grupos[language]} className="mx-auto flex w-full min-w-0 max-w-full gap-1.5 overflow-x-auto overscroll-x-contain rounded-xl border border-border/60 bg-muted/30 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-fit">
      {tipos.map(tipo => {
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
              'h-11 shrink-0 justify-center gap-2 rounded-lg border px-2.5 py-0 font-sans text-xs font-medium tracking-normal hover:text-foreground sm:text-sm',
              activo ? 'border-accent/30 bg-background text-foreground shadow-sm hover:bg-background' : 'border-transparent text-muted-foreground hover:bg-background/70',
            )}
          >
            <span className={cn('min-w-0', activo && 'font-semibold')}>{etiquetasCortas[language][tipo]}</span>
            <span aria-hidden="true" className={cn('shrink-0 rounded-md bg-foreground/5 px-1.5 py-0.5 text-[11px] leading-none tabular-nums sm:text-xs', activo ? 'font-semibold text-foreground' : 'text-muted-foreground/80')}>{cantidades[tipo] ?? 0}</span>
          </Button>
        );
      })}
    </div>
    {bordes.izquierda && <div className="pointer-events-none absolute inset-y-px left-px flex w-14 items-center justify-start rounded-l-xl bg-gradient-to-r from-background via-background/95 to-transparent">
      <button type="button" aria-label={desplazamiento.anterior} onClick={() => desplazar(-1)} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>}
    {bordes.derecha && <div className="pointer-events-none absolute inset-y-px right-px flex w-14 items-center justify-end rounded-r-xl bg-gradient-to-l from-background via-background/95 to-transparent">
      <button type="button" aria-label={desplazamiento.siguiente} onClick={() => desplazar(1)} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg text-accent transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>}
    </div>
  );
}
