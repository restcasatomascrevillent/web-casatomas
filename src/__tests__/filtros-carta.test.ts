import { describe, expect, it } from 'vitest';
import { cumpleDieta, filtrarPlatos, leerFiltros } from '@/lib/filtros-carta';
import type { PlatoSSG } from '@/lib/carta-ssg-types';
const plato = (cambios: Partial<PlatoSSG> = {}): PlatoSSG => ({ id: 'test', nombre: 'Plato', precio_eur: 10, ...cambios });
describe('filtros de la carta', () => {
  it('excluye datos desconocidos sin confundirlos con ausencia de alérgenos', () => {
    for (const dieta of ['celiaquia', 'lactosa', 'vegano', 'vegetariano'] as const) expect(cumpleDieta(plato(), dieta)).toBe(false);
  });
  it('no deduce dietas vegetales por ausencia de alérgenos animales', () => {
    expect(cumpleDieta(plato({ nombre: 'Ensalada mixta', alergenos_oficiales: ['sulfitos'] }), 'vegano')).toBe(false);
    expect(cumpleDieta(plato({ nombre: 'Pollo', alergenos_oficiales: ['gluten'] }), 'vegetariano')).toBe(false);
  });
  it('incluye recetas veganas confirmadas también como vegetarianas', () => {
    const p = plato({ etiquetas_dieteticas: ['vegano'] });
    expect(cumpleDieta(p, 'vegano')).toBe(true);
    expect(cumpleDieta(p, 'vegetariano')).toBe(true);
    expect(cumpleDieta(p, 'lactosa')).toBe(false); // dieta no equivale a ausencia de alérgenos/trazas
  });
  it('permite huevo y leche en vegetariano pero no en vegano', () => {
    const p = plato({ etiquetas_dieteticas: ['vegetariano'], alergenos_oficiales: ['huevos', 'leche'] });
    expect(cumpleDieta(p, 'vegetariano')).toBe(true);
    expect(cumpleDieta(p, 'vegano')).toBe(false);
    expect(cumpleDieta({ ...p, etiquetas_dieteticas: ['vegano'] }, 'vegano')).toBe(false);
  });
  it.each(['carne', 'pescado', 'crustáceos', 'moluscos', 'marisco'])('rechaza contradicciones: %s', alergeno => {
    expect(cumpleDieta(plato({ etiquetas_dieteticas: ['vegetariano'], alergenos_inferidos: [alergeno] }), 'vegetariano')).toBe(false);
  });
  it('rechaza miel para veganos y gelatina para ambos', () => {
    expect(cumpleDieta(plato({ nombre: 'Fruta con miel', etiquetas_dieteticas: ['vegano'] }), 'vegano')).toBe(false);
    expect(cumpleDieta(plato({ ingredientes: ['gelatina'], etiquetas_dieteticas: ['vegano'] }), 'vegetariano')).toBe(false);
  });
  it('tiene en cuenta inferidos y avisos de trazas', () => {
    expect(cumpleDieta(plato({ alergenos_oficiales: ['huevo'], alergenos_inferidos: ['gluten'] }), 'celiaquia')).toBe(false);
    expect(cumpleDieta(plato({ alergenos_oficiales: ['huevo'], alergenos_notas: 'Puede contener trazas de leche' }), 'lactosa')).toBe(false);
  });
  it('combina filtros con AND y quitar filtros restaura todo', () => {
    const platos = [plato({id:'1', alergenos_oficiales: ['huevo']}), plato({id:'2', alergenos_oficiales: ['lácteos']}), plato()];
    expect(filtrarPlatos(platos, ['celiaquia','lactosa']).map(p=>p.id)).toEqual(['1']);
    expect(filtrarPlatos(platos, [])).toEqual(platos);
  });
  it('lee solo filtros válidos y elimina duplicados', () => {
    expect(leerFiltros('?dietas=vegetariano,incorrecto,vegetariano,lactosa')).toEqual(['vegetariano','lactosa']);
    // «Vegano» ya no se ofrece: un enlace antiguo con él lo ignora.
    expect(leerFiltros('?dietas=vegano,lactosa')).toEqual(['lactosa']);
  });
});
