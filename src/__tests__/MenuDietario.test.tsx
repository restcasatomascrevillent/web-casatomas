import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation, Link, Routes, Route } from 'react-router-dom';
import MenuDietario from '@/components/carta/MenuDietario';
import { useFiltrosCarta } from '@/hooks/useFiltrosCarta';
vi.mock('@/i18n/LanguageProvider', () => ({ useTranslations: () => ({ language: 'es' }) }));
vi.mock('@/lib/carta-ssg', () => ({ cartaSSG: { platos: [] } }));
function Location() { const l = useLocation(); return <output data-testid="location">{l.search}{l.hash}</output>; }
describe('controles de dieta', () => {
  it('combina, desactiva y limpia filtros sin perder el ancla ni otros parámetros', () => {
    render(<MemoryRouter initialEntries={['/?origen=mesa#carta']}><MenuDietario><p>Categorías originales</p></MenuDietario><Location /></MemoryRouter>);
    // «Vegano» ya no se ofrece (dueño, 04/11/2026).
    expect(screen.queryByRole('button', { name: /Vegano/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Vegetariano' }));
    expect(screen.getByRole('button', { name: /Vegetariano/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Categorías originales')).toBeInTheDocument();
    expect(screen.getByText('Selecciona tus preferencias y entra en una categoría.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sin lactosa' }));
    expect(screen.getByTestId('location')).toHaveTextContent('origen=mesa&dietas=vegetariano%2Clactosa#carta');
    fireEvent.click(screen.getByRole('button', { name: /Vegetariano/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('dietas=lactosa');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    expect(screen.getByText('Categorías originales')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('?origen=mesa#carta');
  });
  it('mantiene el filtro al entrar en una categoría y al volver a la carta', () => {
    function Navegacion() {
      const { conFiltros } = useFiltrosCarta();
      const { pathname } = useLocation();
      return <><MenuDietario compacto={pathname !== '/carta'} />
        <Link to={conFiltros('/carta/arroces')}>Abrir arroces</Link>
        <Link to={conFiltros('/carta')}>Volver</Link>
        <Location />
      </>;
    }
    render(<MemoryRouter initialEntries={['/carta?dietas=lactosa']}><Routes><Route path="*" element={<Navegacion />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Abrir arroces' })).toHaveAttribute('href', '/carta/arroces?dietas=lactosa');
    fireEvent.click(screen.getByRole('link', { name: 'Abrir arroces' }));
    expect(screen.getByText('Filtros (1)')).toBeInTheDocument();
    const details = screen.getByText('Filtros (1)').closest('details');
    expect(details).not.toHaveAttribute('open');
    fireEvent.click(screen.getByRole('link', { name: 'Volver' }));
    expect(screen.getByRole('button', { name: 'Sin lactosa' })).toHaveAttribute('aria-pressed', 'true');
  });
});
