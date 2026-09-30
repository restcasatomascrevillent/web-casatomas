import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslations } from '@/i18n/LanguageProvider';
import { cartaSSG } from '@/lib/carta-ssg';
import type { PlatoSSG } from '@/lib/carta-ssg-types';
import { DIETAS, filtrarPlatos, leerFiltros } from '@/lib/filtros-carta';

const Resultados = lazy(() => import('./ResultadosDietarios'));
const COPY = {
  es: {
    title: 'Filtrar platos', labels: ['Celíaco', 'Vegano', 'Vegetariano', 'Sin lactosa'], clear: 'Quitar filtros',
    note: 'Filtros según los datos registrados. Celíaco excluye gluten declarado y sus avisos; sin lactosa excluye todos los lácteos. Para celiaquía o alergias, confirma con el personal la preparación y la contaminación cruzada antes de pedir.',
    plant: 'Vegano y vegetariano requieren una receta confirmada por el restaurante. Los platos sin confirmar no se muestran.',
    count: 'platos que coinciden', empty: 'No hay platos con información suficiente que cumplan todos los filtros seleccionados. Consulta al personal por otras opciones.', loading: 'Cargando platos…',
  },
  en: {
    title: 'Filter dishes', labels: ['Coeliac', 'Vegan', 'Vegetarian', 'Lactose-free'], clear: 'Clear filters',
    note: 'Based on recorded data. Coeliac excludes declared gluten and related warnings; lactose-free excludes all dairy. For coeliac disease or allergies, ask staff about preparation and cross-contact before ordering.',
    plant: 'Vegan and vegetarian require a recipe confirmed by the restaurant. Unconfirmed dishes are hidden.',
    count: 'matching dishes', empty: 'No dishes have enough information to match all selected filters. Ask staff about other options.', loading: 'Loading dishes…',
  },
  fr: {
    title: 'Filtrer les plats', labels: ['Cœliaque', 'Végétalien', 'Végétarien', 'Sans lactose'], clear: 'Effacer les filtres',
    note: 'Selon les données enregistrées. Cœliaque exclut le gluten déclaré et ses avertissements ; sans lactose exclut tous les produits laitiers. En cas de maladie cœliaque ou d’allergie, vérifiez la préparation et la contamination croisée avec le personnel avant de commander.',
    plant: 'Végétalien et végétarien nécessitent une recette confirmée par le restaurant. Les plats non confirmés sont masqués.',
    count: 'plats correspondants', empty: 'Aucun plat suffisamment renseigné ne correspond à tous les filtres sélectionnés. Demandez au personnel d’autres options.', loading: 'Chargement des plats…',
  },
};

export default function MenuDietario({ platos = cartaSSG.platos, children }: { platos?: PlatoSSG[]; children: ReactNode }) {
  const { language } = useTranslations();
  const location = useLocation();
  const navigate = useNavigate();
  const copy = COPY[language];
  const filtros = useMemo(() => leerFiltros(location.search), [location.search]);
  const resultados = useMemo(() => filtrarPlatos(platos, filtros), [platos, filtros]);
  const cambiar = (next: typeof filtros) => {
    const params = new URLSearchParams(location.search);
    if (next.length) params.set('dietas', next.join(',')); else params.delete('dietas');
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true, preventScrollReset: true });
  };
  return <>
    <fieldset className="mb-7 rounded-2xl border border-border bg-background p-4 sm:p-5">
      <legend className="px-2 text-sm font-semibold text-primary">{copy.title}</legend>
      <div className="flex flex-wrap gap-2">
        {DIETAS.map((dieta, index) => <button key={dieta} type="button" aria-pressed={filtros.includes(dieta)}
          onClick={() => cambiar(filtros.includes(dieta) ? filtros.filter(x => x !== dieta) : [...filtros, dieta])}
          className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${filtros.includes(dieta) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'}`}>
          {filtros.includes(dieta) && <span aria-hidden="true">✓ </span>}{copy.labels[index]}
        </button>)}
        {filtros.length > 0 && <button type="button" onClick={() => cambiar([])} className="min-h-11 px-3 text-sm underline underline-offset-4">{copy.clear}</button>}
      </div>
      {filtros.length > 0 && <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        {(filtros.includes('celiaquia') || filtros.includes('lactosa')) && <p>{copy.note}</p>}
        {(filtros.includes('vegano') || filtros.includes('vegetariano')) && <p>{copy.plant}</p>}
      </div>}
    </fieldset>
    {filtros.length ? <>
      <p role="status" className="mb-5 text-sm font-medium">{resultados.length} {copy.count}</p>
      {resultados.length ? <Suspense fallback={<p role="status">{copy.loading}</p>}><Resultados platos={resultados} /></Suspense> : <p className="mb-8 rounded-xl bg-muted p-5 text-muted-foreground">{copy.empty}</p>}
    </> : children}
  </>;
}
