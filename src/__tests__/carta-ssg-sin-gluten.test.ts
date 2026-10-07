import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCartaSSG } from '../../scripts/carta-ssg.mjs';

describe('Preparación sin gluten en el prerenderizado', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('conserva el marcador y los alérgenos al compactar los datos de Supabase', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const tabla = new URL(url).pathname.split('/').at(-1);
      const data = tabla === 'Platos'
        ? [{ id: 'p1', nombre: 'Croquetas', categoria: 'SNACK', precio_eur: 12, sin_gluten_disponible: true, alergenos_oficiales: ['gluten'] }]
        : tabla === 'configuracion_web' ? [] : [{ id: 'v1', nombre: 'Referencia', categoria: 'Otros', precio_eur: 10 }];
      return { ok: true, json: async () => data };
    }));
    const carta = await fetchCartaSSG({ url: 'https://local.test', key: 'test' });
    expect(carta.platos[0]).toMatchObject({ sin_gluten_disponible: true, alergenos_oficiales: ['gluten'] });
  });
});
