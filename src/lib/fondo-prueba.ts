import { useCallback, useEffect, useState } from "react";

/**
 * Fondos de prueba para las fotos de platos (SOLO DEMO, no publicar en una release).
 *
 * `?fondo=a|b|c` en una página de la carta cambia las fotos de los platos por las
 * de `public/previews-fondos/img/<variante>/<id>-carta-webp.webp` (el plato
 * recortado sobre otro fondo según su color), sin tocar la base de datos ni
 * Storage. `?fondo=no` lo quita. La elección se recuerda en la pestaña
 * (`sessionStorage`) para seguir navegando por la carta con el mismo fondo.
 *
 * Solo funciona en la demo (el dominio de la rama `staging` de Vercel): en
 * producción (`isDemo` falso) el hook no hace nada y la carta no cambia.
 */

export const VARIANTES_FONDO = {
  a: "Neutros",
  b: "Tierra",
  c: "Azul Casa Tomás",
} as const;
export type VarianteFondo = keyof typeof VARIANTES_FONDO;

const CLAVE = "fondo-prueba";
const RUTA_FOTOS = "/previews-fondos/img";
const RUTA_IDS = "/previews-fondos/ids.json";

/** La demo es el despliegue de la rama `staging`: `web-casatomas-git-staging-….vercel.app`. */
export function esDominioDemo(hostname: string): boolean {
  return /^[a-z0-9-]+-git-staging-[a-z0-9-]+\.vercel\.app$/i.test(hostname);
}

function comoVariante(valor: string | null | undefined): VarianteFondo | null {
  const v = valor?.trim().toLowerCase();
  return v === "a" || v === "b" || v === "c" ? v : null;
}

/**
 * Variante que toca: la del `?fondo=` si viene (`no` la quita) y, si no, la
 * recordada. `null` = fotos de siempre.
 */
export function elegirVariante(search: string, guardada: string | null): VarianteFondo | null {
  const pedida = new URLSearchParams(search).get("fondo");
  if (pedida !== null) return comoVariante(pedida);
  return comoVariante(guardada);
}

/** URL absoluta (el optimizador y `resolverImagen` solo dejan tal cual las que empiezan por http). */
export function urlFotoPrueba(id: string, variante: VarianteFondo, origen: string): string {
  return `${origen}${RUTA_FOTOS}/${variante}/${id}-carta-webp.webp`;
}

/** Sustituye la foto de los platos que tienen versión de prueba; el resto queda igual. */
export function conFondoDePrueba<T extends { id?: string | number; imagen_url?: string }>(
  platos: T[],
  variante: VarianteFondo | null,
  ids: ReadonlySet<string> | null,
  origen: string,
): T[] {
  if (!variante || !ids || ids.size === 0) return platos;
  return platos.map((plato) => {
    const id = plato.id === undefined ? "" : String(plato.id);
    return ids.has(id) ? { ...plato, imagen_url: urlFotoPrueba(id, variante, origen) } : plato;
  });
}

function leerGuardada(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function guardar(variante: VarianteFondo | null): void {
  try {
    if (variante) window.sessionStorage.setItem(CLAVE, variante);
    else window.sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento (modo privado): vale solo para esta página.
  }
}

/**
 * Variante de fondo activa y los ids que tienen foto de prueba. Empieza en
 * `null` también en el navegador (la hidratación tiene que coincidir con el
 * HTML del SSG) y se decide después de montar.
 */
export function useFondoPrueba(): {
  variante: VarianteFondo | null;
  ids: ReadonlySet<string> | null;
  cambiar: (nueva: VarianteFondo | null) => void;
} {
  const [variante, setVariante] = useState<VarianteFondo | null>(null);
  const [ids, setIds] = useState<ReadonlySet<string> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !esDominioDemo(window.location.hostname)) return;
    const elegida = elegirVariante(window.location.search, leerGuardada());
    guardar(elegida);
    setVariante(elegida);
  }, []);

  // Con un fondo de prueba activo, la web apaga el brillo animado de las fotos (ver index.css).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (variante) document.documentElement.dataset.fondoPrueba = variante;
    else delete document.documentElement.dataset.fondoPrueba;
    return () => {
      delete document.documentElement.dataset.fondoPrueba;
    };
  }, [variante]);

  useEffect(() => {
    if (!variante || ids) return;
    let vivo = true;
    fetch(RUTA_IDS)
      .then((r) => (r.ok ? (r.json() as Promise<string[]>) : []))
      .then((lista) => {
        if (vivo) setIds(new Set(lista));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [variante, ids]);

  const cambiar = useCallback((nueva: VarianteFondo | null) => {
    guardar(nueva);
    const url = new URL(window.location.href);
    url.searchParams.set("fondo", nueva ?? "no");
    window.history.replaceState(null, "", url);
    setVariante(nueva);
  }, []);

  return { variante, ids, cambiar };
}
