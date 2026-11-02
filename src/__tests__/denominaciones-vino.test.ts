import { describe, expect, it } from 'vitest';
import { claveOrigen, coordenadasConocidas, nombreOrigen, normalizarOrigen } from '@/lib/origenes-vino';
import { claveDenominacion, denominacionConocida, esComunidadAutonoma } from '@/lib/denominaciones-vino';
import denominaciones from '@/lib/denominaciones-vino.json';
import zonasVino from '@/lib/zonas-vino.json';

// Un vino que el panel dio de alta con la región genérica (caso real del 2-11-2026).
const terrasVellas = { nombre: 'Terras Vellas Albariño Crianza sobre Lías', denominacion_origen: 'D.O. Rías Baixas', ubicacion_region: 'Galicia', ubicacion_pais: 'España' };
const valDoSalnes = { ...terrasVellas, ubicacion_region: 'Val do Salnés, Pontevedra' };
const cambados = [-8.79768, 42.51932];

describe('Respaldo por denominación de origen', () => {
  it('coloca un vino con solo «Galicia» + D.O. Rías Baixas en el centro de la D.O.', () => {
    const coords = coordenadasConocidas(terrasVellas);
    expect(coords).not.toBeNull();
    // Pontevedra, no el punto de ninguna subzona ni el centro de Galicia.
    expect(coords).toEqual([-8.60414, 42.42806]);
    expect(nombreOrigen(terrasVellas)).toBe('D.O. Rías Baixas');
  });

  it('un vino con subzona conocida conserva su punto: la región manda sobre la D.O.', () => {
    expect(coordenadasConocidas(valDoSalnes)).toEqual(cambados);
    expect(nombreOrigen(valDoSalnes)).toBe('Val do Salnés, Pontevedra');
  });

  it('una localidad nueva de la D.O. cae en el centro de la D.O., sin atribuirle el nombre de la localidad', () => {
    const vino = { ...terrasVellas, ubicacion_region: 'Meaño, Pontevedra' };
    expect(coordenadasConocidas(vino)).toEqual(coordenadasConocidas(terrasVellas));
    expect(nombreOrigen(vino)).toBe('D.O. Rías Baixas');
    expect(claveOrigen(vino)).toBe(claveOrigen(terrasVellas));
  });

  it('la D.O. escrita de otra forma agrupa en el mismo punto', () => {
    expect(claveOrigen({ ...terrasVellas, denominacion_origen: 'Rías Baixas' })).toBe(claveOrigen(terrasVellas));
    expect(claveOrigen({ ...terrasVellas, denominacion_origen: 'D.O.  RIAS BAIXAS' })).toBe(claveOrigen(terrasVellas));
  });

  it('sin región, la D.O. también sitúa el vino', () => {
    expect(coordenadasConocidas({ ...terrasVellas, ubicacion_region: null })).toEqual(coordenadasConocidas(terrasVellas));
    expect(coordenadasConocidas({ ...terrasVellas, ubicacion_region: '' })).toEqual(coordenadasConocidas(terrasVellas));
  });

  it('una comunidad autónoma no gana a la D.O.: Ribera del Duero con «Castilla y León» va a su sitio y comparte grupo', () => {
    const regional = { ubicacion_pais: 'España', ubicacion_region: 'Castilla y León', denominacion_origen: 'D.O. Ribera del Duero' };
    const conZona = { ubicacion_pais: 'España', ubicacion_region: 'Ribera del Duero, Castilla y León', denominacion_origen: 'D.O. Ribera del Duero' };
    expect(coordenadasConocidas(regional)).toEqual(coordenadasConocidas(conZona));
    expect(claveOrigen(regional)).toBe(claveOrigen(conZona));
    expect(nombreOrigen(regional)).toBe('Ribera del Duero, Castilla y León');
    // Sin D.O. conocida (IGP), «Castilla y León» sigue siendo una zona válida.
    const igp = { ubicacion_pais: 'España', ubicacion_region: 'Castilla y León', denominacion_origen: 'IGP Castilla y León' };
    expect(coordenadasConocidas(igp)).toEqual((zonasVino as Record<string, { coordenadas: number[] }>)['espana|||castilla y leon'].coordenadas);
    expect(nombreOrigen(igp)).toBe('Castilla y León');
  });

  it('«La Rioja» + D.O.Ca. Rioja se agrupa con los vinos de región «Rioja», sin tapar su marcador', () => {
    const generico = { ubicacion_pais: 'España', ubicacion_region: 'La Rioja', denominacion_origen: 'D.O.Ca. Rioja' };
    const rioja = { ubicacion_pais: 'España', ubicacion_region: 'Rioja', denominacion_origen: 'D.O.Ca. Rioja' };
    expect(coordenadasConocidas(generico)).toEqual(coordenadasConocidas(rioja));
    expect(claveOrigen(generico)).toBe(claveOrigen(rioja));
  });

  it('no inventa: D.O. sin punto fiable, país distinto o dato no comprobable siguen sin ubicar', () => {
    const base = { ubicacion_pais: 'España', ubicacion_region: 'Cataluña' };
    expect(coordenadasConocidas({ ...base, denominacion_origen: 'D.O. Cava' })).toBeNull();
    expect(coordenadasConocidas({ ...base, denominacion_origen: 'IGP Tres Riberas' })).toBeNull();
    expect(coordenadasConocidas({ ...base, denominacion_origen: null })).toBeNull();
    expect(coordenadasConocidas({ ...terrasVellas, ubicacion_pais: 'Francia' })).toBeNull();
    expect(coordenadasConocidas({ ...terrasVellas, ubicacion_pais: null })).toBeNull();
    expect(coordenadasConocidas({ ...terrasVellas, denominacion_origen: 'D.O. Rías Baixas (estimado)' })).toBeNull();
    expect(coordenadasConocidas({ ...terrasVellas, denominacion_origen: 'D.O. Rías Baixas (pendiente)', ubicacion_region: 'Cataluña' })).toBeNull();
  });
});

describe('Datos de denominaciones-vino.json', () => {
  const entradas = Object.entries(denominaciones as Record<string, { nombre: string; coordenadas: number[]; fuente: string }>);

  it('cada clave es «país|||D.O. sin prefijo», normalizada, con nombre, fuente y coordenadas [lon, lat] válidas', () => {
    expect(entradas.length).toBeGreaterThan(0);
    for (const [clave, { nombre, coordenadas, fuente }] of entradas) {
      const [pais, den] = clave.split('|||');
      expect(pais, clave).toBe(normalizarOrigen(pais));
      expect(den, clave).toBe(claveDenominacion(normalizarOrigen(den)));
      expect(denominacionConocida(pais, den), clave).not.toBeNull();
      expect(nombre.trim(), clave).not.toBe('');
      expect(fuente, clave).not.toBe('');
      expect(coordenadas, clave).toHaveLength(2);
      const [lon, lat] = coordenadas;
      expect(Math.abs(lon), clave).toBeLessThanOrEqual(180);
      expect(Math.abs(lat), clave).toBeLessThanOrEqual(90);
    }
  });

  it('si el nombre de una D.O. es una zona de zonas-vino.json, es exactamente el mismo punto (así comparten marcador)', () => {
    const zonas = zonasVino as Record<string, { coordenadas: number[] }>;
    let compartidas = 0;
    for (const [clave, { nombre, coordenadas }] of entradas) {
      const zona = zonas[`${clave.split('|||')[0]}|||${normalizarOrigen(nombre)}`];
      if (!zona) continue;
      compartidas++;
      expect(coordenadas, clave).toEqual(zona.coordenadas);
    }
    expect(compartidas).toBeGreaterThan(5);
  });

  it('Cava, las IGP y las D.O. con subzonas dispersas no tienen punto de D.O.', () => {
    for (const den of ['cava', 'castilla y leon', 'tres riberas', 'alicante', 'vinos de madrid', 'cotes du rhone']) {
      expect(Object.keys(denominaciones).some((c) => c.endsWith(`|||${den}`)), den).toBe(false);
    }
  });
});

describe('Normalización de la D.O.', () => {
  it.each([
    ['D.O. Rías Baixas', 'rias baixas'],
    ['D.O.Ca. Rioja', 'rioja'],
    ['D.O.P. Abadía Retuerta', 'abadia retuerta'],
    ['D.O.Q. Priorat', 'priorat'],
    ['AOC Saint-Émilion Grand Cru', 'saint-emilion grand cru'],
    ['DOCG Moscato d’Asti', "moscato d'asti"],
    ['WO Stellenbosch', 'stellenbosch'],
    ['Mosel', 'mosel'],
    ['Sin D.O.', 'sin d.o.'],
  ])('%s → %s', (texto, esperado) => {
    expect(claveDenominacion(normalizarOrigen(texto))).toBe(esperado);
  });

  it('solo las comunidades autónomas españolas son regiones genéricas', () => {
    expect(esComunidadAutonoma('espana', 'galicia')).toBe(true);
    expect(esComunidadAutonoma('espana', 'castilla y leon')).toBe(true);
    expect(esComunidadAutonoma('espana', 'val do salnes, pontevedra')).toBe(false);
    expect(esComunidadAutonoma('francia', 'galicia')).toBe(false);
  });
});
