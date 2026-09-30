import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cartaSSG } from '@/lib/carta-ssg';
import { filtrarPlatos, leerFiltros } from '@/lib/filtros-carta';
import type { ClaveFiltroDietetico } from '@/lib/alergenos';

/** URL como fuente de verdad: enlaces, recarga, atrás y pestañas nuevas. */
export function useFiltrosCarta() {
  const location = useLocation();
  const navigate = useNavigate();
  const filtros = useMemo(() => leerFiltros(location.search), [location.search]);
  const totales = useMemo(() => {
    const counts = new Map<string, number>();
    for (const plato of filtrarPlatos(cartaSSG.platos, filtros)) {
      const categoria = plato.categoria ?? '';
      counts.set(categoria, (counts.get(categoria) ?? 0) + 1);
    }
    return counts;
  }, [filtros]);
  const conFiltros = (ruta: string) => {
    const [base, hash] = ruta.split('#');
    const [pathname, query] = base.split('?');
    const params = new URLSearchParams(query);
    if (filtros.length) params.set('dietas', filtros.join(','));
    else params.delete('dietas');
    const search = params.toString();
    return pathname + (search ? '?' + search : '') + (hash ? '#' + hash : '');
  };
  const cambiar = (next: ClaveFiltroDietetico[]) => {
    const params = new URLSearchParams(location.search);
    if (next.length) params.set('dietas', next.join(',')); else params.delete('dietas');
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash },
      { replace: true, preventScrollReset: true });
  };
  return { filtros, cambiar, conFiltros, totalCategoria: (clave: string) => totales.get(clave) ?? 0 };
}
