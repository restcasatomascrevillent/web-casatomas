import { describe, expect, it } from 'vitest';
import revision from '../../docs/auditoria-origenes-2026-10-15/revision.json';
import { tipoVino } from '@/lib/tipos-vino';
const vino = (nombre: string) => revision.vinos.find(v => v.nombre === nombre)!;
describe('Revisión completa del catálogo', () => {
  it('incluye todas las referencias con fuente y decisión, sin estimaciones', () => {
    expect(revision.vinos).toHaveLength(244);
    expect(new Set(revision.vinos.map(v => v.id)).size).toBe(244);
    for (const v of revision.vinos) {
      expect(v.estado).not.toBe('pendiente_revision');
      expect(v.fuentes.length).toBeGreaterThan(0);
      expect(JSON.stringify(v.propuesta)).not.toMatch(/estimad|aproximad|según carta/i);
    }
  });
  it('corrige los cruces de D.O. y la ubicación en las barras', () => {
    for (const [n, origen] of [['Cerro del Buey','D.O. Almansa'],['Pepe Carrasca','D.O. Ribeiro'],['Pousada','D.O. Rías Baixas'],['Aaltos Blanco','IGP Castilla y León'],['Rosa Zarza','IGP Castilla y León'],['Unzu Rosé Garnacha','IGP Tres Riberas']]) expect(vino(n).propuesta.denominacion_origen).toBe(origen);
    for (const n of ['Finca Dofí', 'Finca Dofí 2017']) expect(vino(n).propuesta.categoria).toBe('VINOS TINTOS — PRIORAT');
    for (const n of ['Mauro', 'Terreus', 'Quinta Sardonia']) expect(vino(n).propuesta.categoria).toBe('VINOS TINTOS — IGP CASTILLA Y LEÓN');
  });
  it('separa tipo de vino y variedad de uva', () => {
    expect(tipoVino(vino('Otazu Altar').propuesta.categoria)).toBe('tinto');
    expect(tipoVino(vino('Tintoralba Noir (Garnacha)').propuesta.categoria)).toBe('blanco');
    expect(tipoVino(vino('Juvé & Camps Gran Juvé').propuesta.categoria)).toBe('espumoso');
  });
  it('no asigna origen a una referencia que de verdad no se puede identificar', () => {
    expect(vino('Artadi Valdeginés').propuesta.denominacion_origen).toBe('Sin D.O.');
    expect(vino('Artadi Viñas de Gaín').propuesta.denominacion_origen).toBeNull();
    expect(vino('Juvé & Camps Gran Juvé').propuesta.denominacion_origen).toBeNull();
  });
  it('asigna D.O./zona por eliminación o por uva, sin fijar la bodega o cuvée exactas (revisión 2026-10-15 ampliada)', () => {
    for (const n of ['Clos du Ciel', 'Cuvée Vincent', 'De los Abuelos', 'Bobal Rosado Dulce']) {
      const v = vino(n);
      expect(v.estado).toBe('cuvee_pendiente');
      expect(v.propuesta.denominacion_origen).not.toBeNull();
      expect(v.propuesta.ubicacion_region).not.toBeNull();
      expect(v.fuentes.length).toBeGreaterThan(0);
    }
    expect(vino('Clos du Ciel').propuesta.ubicacion_pais).toBe('Sudáfrica');
    expect(vino('Cuvée Vincent').propuesta.denominacion_origen).toBe('AOC Champagne');
    expect(vino('De los Abuelos').propuesta.denominacion_origen).toBe('D.O. Bierzo');
    expect(vino('Bobal Rosado Dulce').propuesta.denominacion_origen).toBe('D.O. Utiel-Requena');
  });
});
