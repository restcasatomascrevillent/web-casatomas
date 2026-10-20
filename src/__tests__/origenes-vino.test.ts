import { afterEach, describe, expect, it, vi } from 'vitest';
import { bodegaVerificada, claveOrigen, coordenadasConocidas, localizarOrigen, nombreOrigen, origenComprobable } from '@/lib/origenes-vino';
import bodegas from '@/lib/bodegas-verificadas.json';
import zonasVino from '@/lib/zonas-vino.json';
afterEach(() => vi.unstubAllGlobals());
const [id, registro] = Object.entries(bodegas)[0];
// Región sin ninguna entrada en `zonas-vino.json`: así las mutaciones que
// invalidan la bodega siguen devolviendo null, y no un punto de zona.
const REGION_SIN_ZONA = 'Región de prueba sin geocodificar';
const aalto = { id, nombre: registro.nombreVino, denominacion_origen: registro.denominacion, ubicacion_pais: 'España', ubicacion_region: REGION_SIN_ZONA };
describe('Orígenes sin estimaciones', () => {
  it('no convierte una D.O. en una bodega, ni inventa coordenadas para una zona desconocida', () => {
    for (const denominacion_origen of ['D.O. Ribera del Duero', 'D.O. Ribera del Duero (estimado)', 'D.O.Ca. Rioja']) {
      const vino = { denominacion_origen, ubicacion_pais: 'España', ubicacion_region: REGION_SIN_ZONA };
      expect(bodegaVerificada(vino)).toBeNull();
      expect(coordenadasConocidas(vino)).toBeNull();
    }
    expect(origenComprobable('Borgoña (estimado)')).toBe('');
    expect(origenComprobable('D.O. Rueda (según carta)')).toBe('');
  });
  it('solo utiliza puntos publicados para referencias identificadas', () => {
    expect(coordenadasConocidas(aalto)).toEqual([-4.25687, 41.62417]);
    expect(bodegaVerificada(aalto)?.fuente).toContain('www.riberadelduero.es');
    expect(coordenadasConocidas({ ...aalto, nombre: 'Otro vino' })).toBeNull();
    expect(coordenadasConocidas({ ...aalto, ubicacion_pais: 'Francia' })).toBeNull();
    expect(coordenadasConocidas({ ...aalto, denominacion_origen: 'D.O. Rueda' })).toBeNull();
  });
  it('usa el centro aproximado de la zona cuando no hay bodega verificada', () => {
    const vino = { ubicacion_pais: 'España', ubicacion_region: 'Castilla y León' };
    expect(bodegaVerificada(vino)).toBeNull();
    const coords = coordenadasConocidas(vino);
    expect(coords).not.toBeNull();
    const [lon, lat] = coords!;
    expect(lon).toBeGreaterThan(-10); expect(lon).toBeLessThan(5);
    expect(lat).toBeGreaterThan(35); expect(lat).toBeLessThan(44);
    // Una bodega verificada en la misma región sigue ganando a la zona.
    expect(coordenadasConocidas({ ...aalto, ubicacion_region: 'Castilla y León' })).toEqual([-4.25687, 41.62417]);
  });
  it('conserva la zona declarada, incluso en D.O. compartidas', () => {
    const vino = { denominacion_origen: 'D.O.Ca. Rioja', ubicacion_region: 'Páganos, Laguardia, Álava', ubicacion_pais: 'España' };
    expect(nombreOrigen(vino)).toBe('Páganos, Laguardia, Álava');
    expect(claveOrigen(vino)).not.toBe(claveOrigen({ ...vino, ubicacion_region: 'San Vicente de la Sonsierra, La Rioja' }));
    expect(claveOrigen(vino)).not.toBe(claveOrigen({ ...vino, ubicacion_pais: 'Argentina' }));
  });
  it('no llama a geocodificación aunque disponga de token', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await localizarOrigen({ ubicacion_pais: 'España', ubicacion_region: 'Álava' }, 'token', new AbortController().signal)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('cada zona guardada tiene una clave normalizada y coordenadas [lon, lat] válidas', () => {
    const entradas = Object.entries(zonasVino as Record<string, { coordenadas: number[] }>);
    expect(entradas.length).toBeGreaterThan(0);
    for (const [clave, { coordenadas }] of entradas) {
      expect(clave).toBe(clave.toLowerCase());
      expect(clave).toContain('|||');
      expect(coordenadas).toHaveLength(2);
      const [lon, lat] = coordenadas;
      expect(Number.isFinite(lon)).toBe(true);
      expect(Number.isFinite(lat)).toBe(true);
      expect(Math.abs(lon)).toBeLessThanOrEqual(180);
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
    }
  });
});
