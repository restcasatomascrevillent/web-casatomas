import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import CartaVinos from '@/components/carta/CartaVinos';

const datos = vi.hoisted(() => ({ vinos: [] as { id: string; nombre: string; categoria: string; precio_eur: number }[], consultas: [] as string[][] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let categorias: string[] | null = null;
  let desde = 0, hasta = 23;
  const consulta = {
    select: () => consulta, is: () => consulta, order: () => consulta,
    eq: (campo: string, valor: string) => { if (campo === 'categoria') categorias = [valor]; return consulta; },
    in: (_campo: string, valores: string[]) => { categorias = valores; datos.consultas.push(valores); return consulta; },
    range: (a: number, b: number) => { desde = a; hasta = b; return consulta; },
    then: (resolver: (valor: unknown) => unknown) => Promise.resolve({ data: datos.vinos.filter(v => !categorias || categorias.includes(v.categoria)).slice(desde, hasta + 1), error: null }).then(resolver),
  };
  return consulta;
} } }));

describe('Filtros rápidos de vinos bajo el mapa', () => {
  beforeEach(() => {
    sessionStorage.clear();
    datos.consultas = [];
    datos.vinos = [
      { id: 't1', nombre: 'Tinto nacional', categoria: 'TINTOS NACIONALES', precio_eur: 20 },
      { id: 't2', nombre: 'Tinto extranjero', categoria: 'TINTOS INTERNACIONALES', precio_eur: 30 },
      { id: 'c1', nombre: 'Champagne francés', categoria: 'CHAMPAGNES', precio_eur: 45 },
      { id: 'c2', nombre: 'Cava catalán', categoria: 'CAVAS', precio_eur: 20 },
      ...Array.from({ length: 30 }, (_, i) => ({ id: `b${i}`, nombre: `Blanco ${i}`, categoria: i % 2 ? 'BLANCOS NACIONALES' : 'BLANCOS INTERNACIONALES', precio_eur: 10 })),
    ];
  });

  const pintar = async () => {
    render(<LanguageProvider><CartaVinos initialVinos={{ Todos: datos.vinos.slice(0, 24) }} initialMapVinos={datos.vinos} /></LanguageProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /tengo 18/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    return within(screen.getByRole('group', { name: 'Filtrar vinos por tipo' }));
  };

  it('agrupa nacionales e internacionales y elimina los demás tipos de la lista', async () => {
    const filtros = await pintar();
    fireEvent.click(filtros.getByRole('button', { name: 'Tintos' }));
    await waitFor(() => expect(screen.getAllByText('Tinto extranjero').length).toBeGreaterThan(0));
    expect(screen.queryByText('Champagne francés')).not.toBeInTheDocument();
    expect(datos.consultas.at(-1)).toEqual(['TINTOS NACIONALES', 'TINTOS INTERNACIONALES']);
    fireEvent.click(filtros.getByRole('button', { name: 'Champagnes y espumosos' }));
    await waitFor(() => expect(screen.getAllByText('Champagne francés').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Cava catalán').length).toBeGreaterThan(0);
    expect(screen.queryByText('Tinto nacional')).not.toBeInTheDocument();
  });

  it('consulta y pagina el tipo completo, aunque no estuviera en la primera página de Todos', async () => {
    const filtros = await pintar();
    fireEvent.click(filtros.getByRole('button', { name: 'Blancos' }));
    await waitFor(() => expect(screen.getAllByText('Blanco 23').length).toBeGreaterThan(0));
    expect(screen.queryByText('Blanco 29')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar más' }));
    await waitFor(() => expect(screen.getAllByText('Blanco 29').length).toBeGreaterThan(0));
    expect(screen.queryByText('Tinto nacional')).not.toBeInTheDocument();
    fireEvent.click(filtros.getByRole('button', { name: 'Todos' }));
    await waitFor(() => expect(screen.getAllByText('Tinto nacional').length).toBeGreaterThan(0));
  });
  it('abre Ribera del Duero desde la semilla y permite cambiar de denominación con etiquetas cortas', async () => {
    datos.vinos = [
      { id: 'r', nombre: 'Tinto de Ribera', categoria: 'VINOS TINTOS — RIBERA DEL DUERO', precio_eur: 35 },
      { id: 'j', nombre: 'Tinto de Rioja', categoria: 'VINOS TINTOS — RIOJA', precio_eur: 25 },
      { id: 'b', nombre: 'Verdejo fresco', categoria: 'VINOS BLANCOS — VERDEJO', precio_eur: 20 },
    ];
    sessionStorage.setItem('edadVinosConfirmada', 'true');
    render(<LanguageProvider><CartaVinos initialVinos={{ Todos: datos.vinos }} initialMapVinos={datos.vinos} /></LanguageProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /tengo 18/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const selector = screen.getByRole('combobox', { name: 'Denominación del vino' });
    expect(selector).toHaveValue('VINOS TINTOS — RIBERA DEL DUERO');
    expect(screen.getByText('Tinto de Ribera')).toBeInTheDocument();
    expect(screen.queryByText('Tinto de Rioja')).not.toBeInTheDocument();
    expect(screen.queryByText('Verdejo fresco')).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ribera del Duero' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Tinto de Ribera')).toBeInTheDocument());
    fireEvent.change(selector, { target: { value: 'VINOS BLANCOS — VERDEJO' } });
    await screen.findByText('Verdejo fresco');
    expect(screen.queryByText('Tinto de Ribera')).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'Todos' } });
    await screen.findByText('Tinto de Rioja');
    expect(screen.getByText('Tinto de Ribera')).toBeInTheDocument();
  });

});
