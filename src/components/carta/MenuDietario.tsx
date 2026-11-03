import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useTranslations } from '@/i18n/LanguageProvider';
import { DIETAS } from '@/lib/filtros-carta';
import { useFiltrosCarta } from '@/hooks/useFiltrosCarta';

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


const RESUMEN = {
  es: { title: 'Filtros', choose: 'Selecciona tus preferencias y entra en una categoría.' },
  en: { title: 'Filters', choose: 'Choose your preferences, then open a category.' },
  fr: { title: 'Filtres', choose: 'Choisissez vos préférences, puis une catégorie.' },
};

export default function MenuDietario({ compacto = false, children }: { compacto?: boolean; children?: ReactNode }) {
  const { language } = useTranslations();
  const { pathname } = useLocation();
  const { filtros, cambiar } = useFiltrosCarta();
  const copy = COPY[language];
  const resumen = RESUMEN[language];
  const nombres = DIETAS.filter(dieta => filtros.includes(dieta)).map(dieta => copy.labels[DIETAS.indexOf(dieta)]);
  const controles = <div className="w-full max-w-2xl">
    <div role="group" aria-label={copy.title} className="grid grid-cols-4 gap-1 sm:gap-3">
      {DIETAS.map((dieta, index) => <button key={dieta} type="button" aria-pressed={filtros.includes(dieta)}
        onClick={() => cambiar(filtros.includes(dieta) ? filtros.filter(x => x !== dieta) : [...filtros, dieta])}
        className={`min-h-11 min-w-0 whitespace-normal break-words text-center leading-tight border-b-2 px-0.5 py-2 text-xs sm:text-sm sm:whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${filtros.includes(dieta) ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}>
        {copy.labels[index]}
      </button>)}
    </div>
    {filtros.length > 0 && <button type="button" onClick={() => cambiar([])} className="min-h-11 text-xs underline underline-offset-4">{copy.clear}</button>}
    {filtros.length > 0 && <div className="mt-2 space-y-2 text-xs leading-relaxed text-muted-foreground">
      {(filtros.includes('celiaquia') || filtros.includes('lactosa')) && <p>{copy.note}</p>}
      {(filtros.includes('vegano') || filtros.includes('vegetariano')) && <p>{copy.plant}</p>}
    </div>}
  </div>;
  return <>
    {compacto ? <div className="sticky top-16 md:top-20 z-30 mb-6 bg-background py-2">
      <details key={pathname} className="group w-full max-w-2xl">
        <summary className="flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="shrink-0">{resumen.title}{filtros.length > 0 ? ` (${filtros.length})` : ''}</span>
          {nombres.length > 0 && <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">{nombres.join(' · ')}</span>}
          <ChevronDown className="h-4 w-4 shrink-0 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="pb-3">{controles}</div>
      </details>
    </div> : <div className="mx-auto mb-7 w-full max-w-2xl">
      {controles}
      {filtros.length > 0 && <p role="status" className="mt-3 text-xs text-muted-foreground">{resumen.choose}</p>}
    </div>}
    {children}
  </>;
}
