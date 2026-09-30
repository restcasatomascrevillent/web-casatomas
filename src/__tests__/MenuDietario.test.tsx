import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import MenuDietario from '@/components/carta/MenuDietario';
vi.mock('@/i18n/LanguageProvider', () => ({ useTranslations: () => ({ language: 'es' }) }));
vi.mock('@/lib/carta-ssg', () => ({ cartaSSG: { platos: [] } }));
function Location() { const l = useLocation(); return <output data-testid="location">{l.search}{l.hash}</output>; }
describe('controles de dieta', () => {
  it('combina, desactiva y limpia filtros sin perder el ancla ni otros parámetros', () => {
    render(<MemoryRouter initialEntries={['/?origen=mesa#carta']}><MenuDietario><p>Categorías originales</p></MenuDietario><Location /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Vegano' }));
    expect(screen.getByRole('button', { name: /Vegano/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Categorías originales')).not.toBeInTheDocument();
    expect(screen.getByText('0 platos que coinciden')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sin lactosa' }));
    expect(screen.getByTestId('location')).toHaveTextContent('origen=mesa&dietas=vegano%2Clactosa#carta');
    fireEvent.click(screen.getByRole('button', { name: /Vegano/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('dietas=lactosa');
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    expect(screen.getByText('Categorías originales')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('?origen=mesa#carta');
  });
});
