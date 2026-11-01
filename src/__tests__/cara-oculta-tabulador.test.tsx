import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import CartaPlatos from '@/components/carta/CartaPlatos';
import ProductoCard from '@/components/carta/ProductoCard';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { resolveTranslatedItem } from '@/lib/carta-i18n';

// QA de salida a producción: el tabulador entraba en la cara de la tarjeta que
// no se ve (la trasera sin girar, la delantera girada) y el lector de pantalla
// la leía entera. La cara oculta va `inert` y `aria-hidden`.
const plato = {
  id: 'p1', nombre: 'Croquetas', categoria: 'SNACK', precio_eur: 12,
  descripcion: 'Croquetas caseras con jamón.', alergenos_oficiales: ['gluten'],
};
const envolver = (children: React.ReactNode) => (
  <MemoryRouter><LanguageProvider>{children}</LanguageProvider></MemoryRouter>
);

const cara = (contenedor: HTMLElement, cual: 'delantera' | 'trasera') =>
  contenedor.querySelector<HTMLElement>(`[data-cara="${cual}"]`)!;

/** Botones que el tabulador puede alcanzar: los que no están dentro de `inert`. */
const tabulables = (contenedor: HTMLElement) =>
  Array.from(contenedor.querySelectorAll<HTMLElement>('button, a[href]')).filter(
    (el) => !el.closest('[inert]') && !(el as HTMLButtonElement).disabled,
  );

const casos = [
  {
    nombre: 'ProductoCard (/carta/:categoria)',
    pintar: () => render(envolver(<ProductoCard plato={resolveTranslatedItem(plato, 'es')} categoria="Snacks" />)),
    boton: /ver ingredientes y alérgenos/i,
  },
  {
    nombre: 'CartaPlatos (carta general)',
    pintar: () => render(envolver(<CartaPlatos showAddButton={false} active={false} initialPlatos={{ 'NOVEDADES DEL DÍA': [plato] }} />)),
    boton: 'Mostrar información del plato',
  },
];

describe.each(casos)('Cara oculta fuera del tabulador · $nombre', ({ pintar, boton }) => {
  it('sin girar, la trasera es inert y aria-hidden y no tiene nada tabulable', () => {
    const { container } = pintar();
    const trasera = cara(container, 'trasera');
    expect(trasera).toHaveAttribute('inert');
    expect(trasera).toHaveAttribute('aria-hidden', 'true');
    expect(cara(container, 'delantera')).not.toHaveAttribute('inert');
    expect(cara(container, 'delantera')).not.toHaveAttribute('aria-hidden');
    expect(tabulables(container).some((el) => trasera.contains(el))).toBe(false);
    // El lector de pantalla solo ve un botón de información: el de delante.
    expect(screen.getAllByRole('button', { name: boton })).toHaveLength(1);
  });

  it('al girar, la delantera pasa a inert, la trasera se libera y el foco va al botón de volver', () => {
    const { container } = pintar();
    const botonDelante = screen.getByRole('button', { name: boton });
    botonDelante.focus();
    fireEvent.click(botonDelante);

    const delantera = cara(container, 'delantera');
    const trasera = cara(container, 'trasera');
    expect(delantera).toHaveAttribute('inert');
    expect(delantera).toHaveAttribute('aria-hidden', 'true');
    expect(trasera).not.toHaveAttribute('inert');
    expect(tabulables(container).some((el) => delantera.contains(el))).toBe(false);
    expect(tabulables(container).some((el) => trasera.contains(el))).toBe(true);

    const activo = document.activeElement as HTMLElement;
    expect(trasera.contains(activo)).toBe(true);
    expect(activo).toHaveAttribute('data-boton-giro');
    expect(activo).toHaveAttribute('aria-expanded', 'true');

    // Y de vuelta: el foco regresa al botón de la delantera.
    fireEvent.click(activo);
    expect(cara(container, 'trasera')).toHaveAttribute('inert');
    expect(cara(container, 'delantera')).not.toHaveAttribute('inert');
    expect(cara(container, 'delantera').contains(document.activeElement)).toBe(true);
  });
});

describe('HTML del SSG', () => {
  it('sale con la trasera inert pero con su contenido en el DOM (buscadores)', () => {
    const html = renderToString(envolver(<ProductoCard plato={resolveTranslatedItem(plato, 'es')} categoria="Snacks" />));
    expect(html).toMatch(/data-cara="trasera"[^>]*inert=""|inert=""[^>]*data-cara="trasera"/);
    expect(html).not.toMatch(/data-cara="delantera"[^>]*inert=""/);
    expect(html).toContain('Croquetas caseras con jamón.');
  });
});
