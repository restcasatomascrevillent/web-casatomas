import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCartaSSG } from '../../scripts/carta-ssg.mjs';

describe('Foto de la carta en el prerenderizado', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('conserva el ?t= de imagen_url para que una foto nueva con el mismo nombre no salga vieja', async () => {
    const foto = 'https://sfonaclosuafvlhutkon.supabase.co/storage/v1/object/public/platos/p1-carta-jpg.webp?t=1794658895000';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const tabla = new URL(url).pathname.split('/').at(-1);
      const data = tabla === 'Platos'
        ? [{ id: 'p1', nombre: 'Navajas', categoria: 'MARISCOS', precio_eur: 18.5, imagen_url: foto }]
        : tabla === 'configuracion_web' ? [] : [{ id: 'v1', nombre: 'Referencia', categoria: 'Otros', precio_eur: 10 }];
      return { ok: true, json: async () => data };
    }));
    const carta = await fetchCartaSSG({ url: 'https://local.test', key: 'test' });
    expect(carta.platos[0].imagen_url).toBe(foto);
  });
});
