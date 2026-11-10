import { claveAlergeno, cumpleAptitudPlato, datosAlergenos, normalizarTexto, normalizeAlergenos, type ClaveFiltroDietetico } from './alergenos';
import type { PlatoSSG } from './carta-ssg-types';
import confirmaciones from '@/data/dietas-confirmadas.json';

/**
 * Filtros que se ofrecen en la carta. «Vegano» se quitó a petición del dueño
 * (04/11/2026); `cumpleDieta` lo sigue sabiendo evaluar porque una receta vegana
 * confirmada también cuenta como vegetariana. Un `?dietas=vegano` antiguo se ignora.
 */
export const DIETAS = ['celiaquia', 'vegetariano', 'lactosa'] as const;
export type Dieta = (typeof DIETAS)[number];
const etiquetasConfirmadas = confirmaciones as Record<string, string[]>;

export function leerFiltros(search: string): Dieta[] {
  const values = new URLSearchParams(search).get('dietas')?.split(',') ?? [];
  return DIETAS.filter(dieta => values.includes(dieta));
}

/** Los alérgenos permiten excluir, pero no demuestran que una receta sea vegetal. */
export function cumpleDieta(plato: PlatoSSG, dieta: ClaveFiltroDietetico): boolean {
  // Celíacos y sin lactosa: lo decidido a mano en el panel manda; si no, alérgenos (`cumpleAptitudPlato`).
  if (dieta === 'celiaquia' || dieta === 'lactosa') return cumpleAptitudPlato(plato, dieta);
  const datos = datosAlergenos(plato);
  const etiquetas = [...normalizeAlergenos(plato.etiquetas_dieteticas), ...(etiquetasConfirmadas[plato.id] ?? [])].map(normalizarTexto);
  if (!etiquetas.includes('vegano') && !(dieta === 'vegetariano' && etiquetas.includes('vegetariano'))) return false;
  const excluidos = ['carne', 'pescado', 'crustaceos', 'moluscos', 'marisco', ...(dieta === 'vegano' ? ['huevo', 'lacteos'] : [])];
  if ([...datos.oficiales, ...datos.inferidos].some(x => excluidos.includes(claveAlergeno(x)))) return false;
  // Ante ingredientes/avisos contradictorios o condicionados, requiere revisión humana.
  const texto = normalizarTexto([plato.nombre, plato.descripcion, ...normalizeAlergenos(plato.ingredientes), datos.notas].filter(Boolean).join(' '));
  const animal = /\b(carne|pollo|jamon|atun|pescado|marisco|pulpo|anchoa|anchoas|gelatina|caldo de carne|foie|bacon|ternera|cerdo|vaca|perdiz|consultar|consulte|preguntar|consult|ask|demander)\b/;
  const noVegano = /\b(huevo|huevos|leche|queso|nata|mantequilla|miel|yogur|lacteos)\b/;
  return !animal.test(texto) && !(dieta === 'vegano' && noVegano.test(texto));
}

export function filtrarPlatos<T extends PlatoSSG>(platos: T[], filtros: readonly ClaveFiltroDietetico[]): T[] {
  return platos.filter(plato => filtros.every(filtro => cumpleDieta(plato, filtro)));
}
