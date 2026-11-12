import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CartaPlatos from '@/components/carta/CartaPlatos';
import ProductoCard from '@/components/carta/ProductoCard';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { resolveTranslatedItem } from '@/lib/carta-i18n';
import { cumpleDieta } from '@/lib/filtros-carta';

const plato = {
  id: 'p1', nombre: 'Croquetas', categoria: 'SNACK', precio_eur: 12,
  descripcion: 'Croquetas caseras con jamón y una bechamel suave.',
  featured: true, sin_gluten_disponible: true, alergenos_oficiales: ['gluten', 'leche'],
};
const envolver = (children: React.ReactNode) => <MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter>;

describe('Información y preparación alternativa de los platos', () => {
  it('la carta general enseña la descripción tras pulsar la i y conserva los alérgenos originales', () => {
    render(envolver(<CartaPlatos showAddButton={false} active={false} initialPlatos={{ "NOVEDADES DEL DÍA": [plato] }} />));
    fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar información del plato' })[0]);
    expect(screen.getByText(plato.descripcion)).toBeInTheDocument();
    expect(screen.getAllByText('Se puede hacer sin gluten').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gluten').length).toBeGreaterThan(0);
  });

  it('la tarjeta por categoría también muestra la descripción y la opción sin gluten', () => {
    const { container } = render(envolver(<ProductoCard plato={resolveTranslatedItem(plato, 'es')} categoria="Snacks" />));
    fireEvent.click(screen.getAllByRole('button', { name: /ver ingredientes y alérgenos/i })[0]);
    // La descripción sale delante (recortada a dos líneas) y entera detrás, tras la «i».
    const trasera = container.querySelector('[data-cara="trasera"]')!;
    expect(trasera).not.toHaveAttribute('inert');
    expect(trasera).toHaveTextContent(plato.descripcion);
    expect(screen.getAllByText('Se puede hacer sin gluten').length).toBeGreaterThan(0);
    expect(screen.getByText('Gluten')).toBeInTheDocument();
  });

  it('solo la preparación explícitamente marcada admite un plato con gluten en el filtro de celiaquía', () => {
    expect(cumpleDieta(plato, 'celiaquia')).toBe(true);
    expect(cumpleDieta({ ...plato, sin_gluten_disponible: false }, 'celiaquia')).toBe(false);
    expect(cumpleDieta(plato, 'lactosa')).toBe(false);
  });
});
