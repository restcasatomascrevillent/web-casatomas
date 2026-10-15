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
  it('no asigna origen a referencias ambiguas ni traslada sellos a añadas sin identificar', () => {
    for (const n of ['Clos du Ciel', 'Cuvée Vincent', 'De los Abuelos', 'Bobal Rosado Dulce']) {
      expect(vino(n).propuesta.denominacion_origen).toBeNull();
      expect(vino(n).propuesta.ubicacion_region).toBeNull();
    }
    expect(vino('Artadi Valdeginés').propuesta.denominacion_origen).toBe('Sin D.O.');
    expect(vino('Artadi Viñas de Gaín').propuesta.denominacion_origen).toBeNull();
    expect(vino('Juvé & Camps Gran Juvé').propuesta.denominacion_origen).toBeNull();
  });
});
