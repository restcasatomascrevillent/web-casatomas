import ProductoCard from './ProductoCard';
import { agruparPorCategoria } from '@/lib/carta-ssg';
import type { PlatoSSG } from '@/lib/carta-ssg-types';
import { useTranslations } from '@/i18n/LanguageProvider';
import { usePedido } from '@/hooks/usePedido';
import { useToast } from '@/hooks/use-toast';

export default function ResultadosDietarios({ platos }: { platos: PlatoSSG[] }) {
  const { language, t } = useTranslations();
  const { anadir, cantidadDe } = usePedido();
  const { toast } = useToast();
  return <div className="mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-6">
    {agruparPorCategoria(platos, language).flatMap(seccion => seccion.items).map(plato => <ProductoCard key={plato.id}
      plato={plato} categoria={plato.displayCategoria} cantidadEnPedido={cantidadDe(plato)}
      onAnadir={() => {
        anadir({ ...plato, nombre: plato.displayNombre || plato.nombre });
        toast({ title: t.platos.toasts.addedTitle, description: t.platos.toasts.addedDescription.replace('{name}', plato.displayNombre) });
      }} />)}
  </div>;
}
