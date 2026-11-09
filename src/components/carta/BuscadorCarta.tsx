import { useBusquedaRegistrada } from "@/lib/actividad/useBusquedaRegistrada";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MenuDietario from "@/components/carta/MenuDietario";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import type { Language } from "@/i18n/types";
import { useBusquedaCarta } from "@/hooks/useBusquedaCarta";
import { useFiltrosCarta } from "@/hooks/useFiltrosCarta";
import {
  buscarBebidas,
  buscarPlatos,
  buscarVinos,
  fraseCoincidente,
  indexarBebidas,
  indexarPlatos,
  indexarVinos,
  terminosDeBusqueda,
  type GrupoResultados,
} from "@/lib/busqueda-carta";
import { cartaSSG } from "@/lib/carta-ssg";
import { cargarBodega, type Bodega } from "./cargarBodega";
import {
  CATEGORIAS_BEBIDAS,
  CATEGORIAS_CARTA,
  etiquetaCategoriaIdioma,
  rutaCategoria,
  rutaPlato,
} from "@/lib/carta-rutas";
import { filtrarPlatos } from "@/lib/filtros-carta";
import { mostrarPrecio, precioConocido } from "@/lib/precios";
import { origenComprobable } from "@/lib/origenes-vino";
import { etiquetaUnidadPlato } from "@/lib/unidades-platos";
import type { TipoVino } from "@/lib/tipos-vino";

/**
 * Textos propios del buscador. Mapa local (como el resto de páginas de la
 * carta) y no claves nuevas en `src/i18n/languages/*`: solo se usan aquí, y
 * `Record<Language, …>` obliga a tenerlos en los tres idiomas.
 */
const TEXTOS: Record<
  Language,
  {
    etiqueta: string;
    placeholder: string;
    limpiar: string;
    recuento: (resultados: number, grupos: number, consulta: string) => string;
    vacioTitulo: (consulta: string) => string;
    vacioTexto: string;
    vacioFiltros: string;
    verTodo: string;
    verSeccion: string;
    verVinos: string;
    verBebidas: string;
    tiposVino: Record<Exclude<TipoVino, "todos">, string>;
  }
> = {
  es: {
    etiqueta: "Buscar en la carta",
    placeholder: "Plato, ingrediente, vino o bebida…",
    limpiar: "Borrar la búsqueda",
    recuento: (n, g, q) =>
      n === 0
        ? `Sin resultados para «${q}».`
        : `${n} ${n === 1 ? "resultado" : "resultados"} para «${q}»${g > 1 ? ` en ${g} categorías` : ""}.`,
    vacioTitulo: (q) => `No hemos encontrado nada con «${q}».`,
    vacioTexto: "Prueba con otra palabra (un ingrediente, por ejemplo) o mira la carta por categorías.",
    vacioFiltros: "Tienes filtros de platos activados: puede que estén ocultando algún plato.",
    verTodo: "Ver toda la carta",
    verSeccion: "Ver sección",
    verVinos: "Ver carta de vinos",
    verBebidas: "Ver bebidas",
    tiposVino: {
      tinto: "Vinos tintos",
      blanco: "Vinos blancos",
      espumoso: "Champagnes y espumosos",
      rosado: "Vinos rosados",
      otro: "Otros vinos",
    },
  },
  en: {
    etiqueta: "Search the menu",
    placeholder: "Dish, ingredient, wine or drink…",
    limpiar: "Clear search",
    recuento: (n, g, q) =>
      n === 0
        ? `No results for “${q}”.`
        : `${n} ${n === 1 ? "result" : "results"} for “${q}”${g > 1 ? ` in ${g} categories` : ""}.`,
    vacioTitulo: (q) => `We couldn't find anything for “${q}”.`,
    vacioTexto: "Try another word (an ingredient, for example) or browse the menu by category.",
    vacioFiltros: "You have dish filters switched on: they may be hiding some dishes.",
    verTodo: "View the whole menu",
    verSeccion: "View section",
    verVinos: "View wine list",
    verBebidas: "View drinks",
    tiposVino: {
      tinto: "Red wines",
      blanco: "White wines",
      espumoso: "Champagnes and sparkling wines",
      rosado: "Rosé wines",
      otro: "Other wines",
    },
  },
  fr: {
    etiqueta: "Rechercher dans la carte",
    placeholder: "Plat, ingrédient, vin ou boisson…",
    limpiar: "Effacer la recherche",
    recuento: (n, g, q) =>
      n === 0
        ? `Aucun résultat pour « ${q} ».`
        : `${n} ${n > 1 ? "résultats" : "résultat"} pour « ${q} »${g > 1 ? ` dans ${g} catégories` : ""}.`,
    vacioTitulo: (q) => `Nous n'avons rien trouvé pour « ${q} ».`,
    vacioTexto: "Essayez un autre mot (un ingrédient, par exemple) ou parcourez la carte par catégorie.",
    vacioFiltros: "Des filtres de plats sont activés : ils masquent peut-être certains plats.",
    verTodo: "Voir toute la carte",
    verSeccion: "Voir la section",
    verVinos: "Voir la carte des vins",
    verBebidas: "Voir les boissons",
    tiposVino: {
      tinto: "Vins rouges",
      blanco: "Vins blancs",
      espumoso: "Champagnes et effervescents",
      rosado: "Vins rosés",
      otro: "Autres vins",
    },
  },
};

/** Ids fijos (una sola instancia por página): sin `useId`, el HTML del SSG no cambia de ids. */
const ID_CAMPO = "buscador-carta";
const ID_ESTADO = "buscador-carta-estado";

/**
 * Vinos y bebidas NO viajan en el bundle de `/carta` (ver `vite.config.ts`):
 * se piden la primera vez que el visitante va a buscar (al entrar en el campo)
 * y salen del mismo chunk que usan `/carta/vinos` y `/carta/bebidas`. Si fallan
 * (sin conexión), el buscador sigue funcionando con los platos.
 */
function useBodegaPerezosa() {
  const [bodega, setBodega] = useState<Bodega | null>(null);
  const pedida = useRef(false);
  const cargar = useCallback(() => {
    if (pedida.current) return;
    pedida.current = true;
    cargarBodega()
      .then(setBodega)
      .catch(() => {
        // Se reintenta en la próxima interacción.
        pedida.current = false;
      });
  }, []);
  return { bodega, cargar };
}

const precioConUnidad = (precio: unknown, unidad: string | undefined, language: Language) =>
  `${mostrarPrecio(precio, language)}${precioConocido(precio) && unidad ? ` / ${etiquetaUnidadPlato(unidad, language)}` : ""}`;

interface FilaProps {
  nombre: string;
  detalle?: string;
  precio: string;
  /** Con destino, la fila entera es un enlace (con flecha); sin él, solo informa. */
  to?: string;
}

/** Misma línea que la lista de categorías de la portada (`CartaSection`). */
const Fila = ({ nombre, detalle, precio, to }: FilaProps) => {
  const contenido = (
    <>
      <span className="min-w-0">
        <span className="block font-libre-baskerville text-base sm:text-lg text-foreground break-words transition-colors group-hover:text-accent">
          {nombre}
        </span>
        {detalle && (
          <span className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{detalle}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1 pt-0.5 text-sm sm:text-base font-bold text-accent whitespace-nowrap">
        {precio}
        {to && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      </span>
    </>
  );
  const clases = "flex items-start justify-between gap-4 py-3";
  return (
    <li className="border-b border-border/70 last:border-b-0">
      {to ? (
        <Link
          to={to}
          className={`group ${clases} rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
        >
          {contenido}
        </Link>
      ) : (
        <div className={clases}>{contenido}</div>
      )}
    </li>
  );
};

interface GrupoProps {
  id: string;
  titulo: string;
  total: number;
  enlace: { to: string; texto: string };
  children: ReactNode;
}

const Grupo = ({ id, titulo, total, enlace, children }: GrupoProps) => (
  <section aria-labelledby={id}>
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-primary/15 pb-2">
      <h3 id={id} className="min-w-0 font-libre-baskerville text-lg sm:text-xl font-bold text-primary break-words">
        {titulo} <span className="ml-1 text-sm font-normal text-muted-foreground">{total}</span>
      </h3>
      <Link
        to={enlace.to}
        className="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
      >
        {enlace.texto}
      </Link>
    </div>
    <ul>{children}</ul>
  </section>
);

const total = <T,>(grupos: GrupoResultados<T>[]) =>
  grupos.reduce((suma, grupo) => suma + grupo.items.length, 0);

interface BuscadorCartaProps {
  /** Títulos de las dos partes de `/carta`, para repetirlos en los resultados. */
  titulos: { platos: string; bodega: string };
  /** El índice de la carta tal cual: es lo que se ve mientras no se busca. */
  children: ReactNode;
}

/**
 * Buscador de `/carta`: platos (con los filtros dietéticos de la página),
 * vinos y bebidas, sin tildes ni mayúsculas y en el idioma del visitante.
 *
 * Convivencia con la navegación por categorías: sin búsqueda se ve el índice
 * de siempre (`children`), intacto. Al buscar, el índice se sustituye por los
 * resultados agrupados por categoría, en el orden de la carta; cada grupo
 * enlaza a su página y cada plato a su tarjeta (`/carta/<categoría>#plato-<id>`,
 * que lo resalta). Limpiar devuelve el índice.
 *
 * SSG: en el HTML prerenderizado (y en el primer render al hidratar) la
 * búsqueda está vacía, así que la página es el índice de siempre con el campo
 * encima. No hay nada que dependa del navegador hasta que se escribe.
 */
const BuscadorCarta = ({ titulos, children }: BuscadorCartaProps) => {
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  const { filtros, conFiltros } = useFiltrosCarta();
  const { texto, setTexto, consulta, activa, limpiar } = useBusquedaCarta();
  const { bodega, cargar } = useBodegaPerezosa();
  const campo = useRef<HTMLInputElement>(null);

  // Si alguien escribió antes de que la página terminara de hidratarse, React
  // conserva lo escrito en el campo pero el estado nace vacío: se recoge aquí.
  useEffect(() => {
    const escrito = campo.current?.value ?? "";
    if (escrito && escrito !== texto) setTexto(escrito);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al volver atrás con una búsqueda restaurada también hacen falta vinos y bebidas.
  useEffect(() => {
    if (texto.trim()) cargar();
  }, [texto, cargar]);

  const terminos = useMemo(() => terminosDeBusqueda(consulta), [consulta]);
  const platosVisibles = useMemo(() => filtrarPlatos(cartaSSG.platos, filtros), [filtros]);
  // Los índices solo se construyen al empezar a buscar, y una vez por idioma.
  const indicePlatos = useMemo(
    () => (activa ? indexarPlatos(platosVisibles, language) : []),
    [activa, platosVisibles, language],
  );
  const indiceVinos = useMemo(
    () => (activa && bodega ? indexarVinos(bodega.vinos, language) : []),
    [activa, bodega, language],
  );
  const indiceBebidas = useMemo(
    () => (activa && bodega ? indexarBebidas(bodega.bebidas, language) : []),
    [activa, bodega, language],
  );

  const gruposPlatos = useMemo(() => buscarPlatos(indicePlatos, terminos, CATEGORIAS_CARTA), [indicePlatos, terminos]);
  const gruposVinos = useMemo(() => buscarVinos(indiceVinos, terminos), [indiceVinos, terminos]);
  const gruposBebidas = useMemo(
    () => buscarBebidas(indiceBebidas, terminos, CATEGORIAS_BEBIDAS.map((categoria) => categoria.clave)),
    [indiceBebidas, terminos],
  );

  const resultados = total(gruposPlatos) + total(gruposVinos) + total(gruposBebidas);
  // Super Admin › Logs: cuántas letras y cuántos resultados, nunca el texto buscado.
  useBusquedaRegistrada(activa ? consulta : "", resultados, "toda");
  const grupos = gruposPlatos.length + gruposVinos.length + gruposBebidas.length;
  const rutaVinos = conFiltros(construirRutaIdioma("/carta/vinos", language));
  const rutaBebidas = conFiltros(construirRutaIdioma("/carta/bebidas", language));

  const borrar = () => {
    limpiar();
    campo.current?.focus();
  };

  return (
    <>
      <div className={`mx-auto w-full max-w-2xl ${activa ? "mb-4" : "mb-10"}`}>
        <form
          role="search"
          onSubmit={(evento) => {
            evento.preventDefault();
            // En el móvil, «Buscar» en el teclado lo cierra para ver los resultados.
            if (window.matchMedia?.("(pointer: coarse)").matches) campo.current?.blur();
          }}
        >
          <label htmlFor={ID_CAMPO} className="mb-2 block text-sm font-semibold text-primary">
            {textos.etiqueta}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={campo}
              id={ID_CAMPO}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              placeholder={textos.placeholder}
              aria-describedby={ID_ESTADO}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onFocus={cargar}
              onKeyDown={(evento) => {
                if (evento.key === "Escape" && texto) {
                  evento.preventDefault();
                  limpiar();
                }
              }}
              className="h-12 pl-10 pr-12 text-base font-sans [&::-webkit-search-cancel-button]:hidden"
            />
            {texto && (
              <button
                type="button"
                onClick={borrar}
                aria-label={textos.limpiar}
                title={textos.limpiar}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </form>
        {/* Siempre en el DOM (vacío sin búsqueda) para que los lectores de
            pantalla anuncien cada cambio del recuento. */}
        <p
          id={ID_ESTADO}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={activa ? "mt-3 text-sm text-muted-foreground" : "sr-only"}
        >
          {activa ? textos.recuento(resultados, grupos, consulta) : ""}
        </p>
      </div>

      {!activa ? (
        children
      ) : (
        <div className="animate-fade-up">
          {/* Los filtros dietéticos siguen a mano (plegados) y se aplican a
              los platos encontrados, igual que en cada categoría. */}
          <MenuDietario compacto />

          {resultados === 0 ? (
            <div className="mx-auto max-w-2xl py-8 text-center">
              <p className="font-libre-baskerville text-xl text-primary">{textos.vacioTitulo(consulta)}</p>
              <p className="mt-2 text-muted-foreground">{textos.vacioTexto}</p>
              {filtros.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{textos.vacioFiltros}</p>}
              <Button type="button" variant="outline" onClick={borrar} className="mt-6 rounded-full px-6">
                {textos.verTodo}
              </Button>
            </div>
          ) : (
            <div className="space-y-12">
              {gruposPlatos.length > 0 && (
                <section aria-labelledby="resultados-platos">
                  <h2 id="resultados-platos" className="mb-6 text-2xl md:text-3xl font-bold text-primary">
                    {titulos.platos}
                  </h2>
                  <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
                    {gruposPlatos.map((grupo) => {
                      const categoria = CATEGORIAS_CARTA.find((candidata) => candidata.clave === grupo.clave);
                      const rutaGrupo = categoria ? conFiltros(rutaCategoria(categoria.slug, language)) : "";
                      return (
                        <Grupo
                          key={grupo.clave}
                          id={`resultados-${categoria?.slug ?? grupo.clave}`}
                          titulo={etiquetaCategoriaIdioma(grupo.clave, language)}
                          total={grupo.items.length}
                          enlace={{ to: rutaGrupo, texto: textos.verSeccion }}
                        >
                          {grupo.items.map((plato) => (
                            <Fila
                              key={plato.id}
                              nombre={plato.displayNombre}
                              detalle={plato.displayDescripcion?.trim() || undefined}
                              precio={precioConUnidad(plato.precio_eur, plato.unidad, language)}
                              to={conFiltros(rutaPlato(plato.id, language) ?? rutaGrupo)}
                            />
                          ))}
                        </Grupo>
                      );
                    })}
                  </div>
                </section>
              )}

              {gruposVinos.length + gruposBebidas.length > 0 && (
                <section aria-labelledby="resultados-bodega">
                  <h2 id="resultados-bodega" className="mb-6 text-2xl md:text-3xl font-bold text-primary">
                    {titulos.bodega}
                  </h2>
                  <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
                    {gruposVinos.map((grupo) => (
                      <Grupo
                        key={`vino-${grupo.clave}`}
                        id={`resultados-vinos-${grupo.clave}`}
                        titulo={textos.tiposVino[grupo.clave as Exclude<TipoVino, "todos">] ?? grupo.clave}
                        total={grupo.items.length}
                        enlace={{ to: rutaVinos, texto: textos.verVinos }}
                      >
                        {grupo.items.map((vino, indice) => (
                          <Fila
                            key={vino.id}
                            nombre={vino.displayNombre}
                            // Si sale por su nota de cata o maridaje («… con
                            // arroces»), se enseña esa frase; si no, su origen.
                            detalle={
                              (grupo.porDescripcion[indice] && fraseCoincidente(vino.displayDescripcion, terminos)) ||
                              origenComprobable(vino.denominacion_origen) ||
                              origenComprobable(vino.ubicacion_region) ||
                              undefined
                            }
                            precio={mostrarPrecio(vino.precio_eur, language)}
                          />
                        ))}
                      </Grupo>
                    ))}
                    {gruposBebidas.map((grupo) => (
                      <Grupo
                        key={`bebida-${grupo.clave}`}
                        id={`resultados-bebidas-${grupo.clave.replace(/[^A-Za-z0-9_-]+/g, "-")}`}
                        titulo={grupo.items[0]?.displayCategoria || grupo.clave}
                        total={grupo.items.length}
                        enlace={{ to: rutaBebidas, texto: textos.verBebidas }}
                      >
                        {grupo.items.map((bebida, indice) => (
                          <Fila
                            key={bebida.id}
                            nombre={bebida.displayNombre}
                            detalle={
                              [
                                bebida.tamano,
                                grupo.porDescripcion[indice]
                                  ? fraseCoincidente(bebida.displayDescripcion, terminos)
                                  : bebida.displayDescripcion?.trim(),
                              ]
                                .filter(Boolean)
                                .join(" · ") || undefined
                            }
                            precio={mostrarPrecio(bebida.precio_eur, language)}
                          />
                        ))}
                      </Grupo>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default BuscadorCarta;
