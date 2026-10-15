import { afterEach, describe, expect, it, vi } from 'vitest';
import { bodegaVerificada, claveOrigen, coordenadasConocidas, localizarOrigen, nombreOrigen, origenComprobable } from '@/lib/origenes-vino';
import bodegas from '@/lib/bodegas-verificadas.json';
afterEach(() => vi.unstubAllGlobals());
const [id, registro] = Object.entries(bodegas)[0];
const aalto = { id, nombre: registro.nombreVino, denominacion_origen: registro.denominacion, ubicacion_pais: 'España', ubicacion_region: 'Castilla y León' };
describe('Orígenes sin estimaciones', () => {
  it('no convierte una D.O. ni el centro de una región en una bodega', () => {
    for (const denominacion_origen of ['D.O. Ribera del Duero', 'D.O. Ribera del Duero (estimado)', 'D.O.Ca. Rioja']) {
      expect(coordenadasConocidas({ denominacion_origen, ubicacion_pais: 'España', ubicacion_region: 'Castilla y León' })).toBeNull();
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
});
