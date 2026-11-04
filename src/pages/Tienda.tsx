import { useEffect, useMemo, useState } from "react";
import { Info, Loader2, Search } from "lucide-react";
import datosVinos from "virtual:carta-ssg/vinos";
import datosTienda from "virtual:carta-ssg/tienda";
import { Seo } from "@/components/Seo";
import { JsonLd } from "@/components/JsonLd";
import CartaPageLayout from "@/components/carta/CartaPageLayout";
import FiltrosTipoVino, { BarraFiltrosVino } from "@/components/carta/FiltrosTipoVino";
import TarjetaVinoTienda from "@/components/tienda/TarjetaVinoTienda";
import ComoComprarTienda from "@/components/tienda/ComoComprarTienda";
import TiendaCerrada from "@/components/tienda/TiendaCerrada";
import ConTelefono from "@/components/tienda/ConTelefono";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfigTienda, useVinosTienda } from "@/hooks/useTienda";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTranslations } from "@/i18n/LanguageProvider";
import { alternatesDePagina, construirRutaIdioma } from "@/i18n/routing";
import { TEXTOS_TIENDA } from "@/i18n/tienda";
import { breadcrumbSchema, SITE_URL } from "@/lib/negocio";
import { filtrarVinos } from "@/lib/filtro-vinos";
import { categoriaCorta, tipoDesdeCategoria, tipoVino } from "@/lib/tipos-vino";
import { normalizarConfigTienda, vinosALaVenta, type VinoTienda } from "@/lib/tienda";

const RUTA_ES = "/tienda";
/** Fichas por tanda, como la carta de vinos (`PAGE_SIZE` de `CartaVinos`). */
const POR_PAGINA = 24;

/** Semillas del build (ver `scripts/carta-ssg.mjs`): lo que sale en el HTML del SSG. */
const SEMILLA_CONFIG = normalizarConfigTienda(datosTienda.config);
const SEMILLA_VINOS: VinoTienda[] = (datosVinos.vinos ?? []).map((vino) => ({
  id: vino.id,
  nombre: vino.nombre,
  nombre_en: vino.nombre_en,
  nombre_fr: vino.nombre_fr,
  categoria: vino.categoria,
  precio_eur: vino.precio_eur,
  orden: vino.orden,
  imagen_url: vino.imagen_url,
  denominacion_origen: vino.denominacion_origen,
  ubicacion_region: vino.ubicacion_region,
  ubicacion_pais: vino.ubicacion_pais,
}));

/**
 * `/tienda` (y `/en/tienda`, `/fr/tienda`): ESCAPARATE de los vinos de la
 * carta que se venden para llevar, cada uno con su precio de tienda (calculado
 * con el `descuento_pct` del panel, `configuracion_tienda`; la página no habla
 * de descuentos ni del precio de carta). No hay compra por internet: el bloque «Cómo
 * comprar» explica que se compran en el restaurante (o se reservan por
 * teléfono) con la dirección, el horario y el teléfono.
 *
 * La configuración y los vinos salen ya en el HTML del SSG (semilla del build)
 * y se ponen al día en el navegador (`useConfigTienda`, `useVinosTienda`).
 * Con la tienda apagada en el panel, un aviso amable (`TiendaCerrada`).
 *
 * Sin diálogo de edad al entrar (mismo criterio que `/carta/vinos`: el HTML
 * prerenderizado no puede quedar detrás de un modal): aviso permanente en
 * «Cómo comprar»; la edad se comprueba al vender, en el restaurante.
 */
const TiendaPagina = () => {
  const { language } = useTranslations();
  const textos = TEXTOS_TIENDA[language];
  const url = `${SITE_URL}${construirRutaIdioma(RUTA_ES, language)}`;

  const { config, pendiente } = useConfigTienda(SEMILLA_CONFIG);
  const vinos = useVinosTienda(SEMILLA_VINOS);
  const activa = !!config?.activa;
  const descuento = config?.descuento_pct ?? 0;
  const aLaVenta = useMemo(() => (config ? vinosALaVenta(vinos, config) : []), [vinos, config]);

  // Filtros (los de la carta de vinos: tipo, denominación y buscador) y tandas.
  const [busqueda, setBusqueda] = useState("");
  const busquedaDiferida = useDebouncedValue(busqueda, 250);
  const [categoria, setCategoria] = useState("Todos");
  const [visibles, setVisibles] = useState(POR_PAGINA);
  useEffect(() => setVisibles(POR_PAGINA), [categoria, busquedaDiferida]);
  const filtrados = useMemo(
    () => filtrarVinos(aLaVenta, { categoria, busqueda: busquedaDiferida.trim(), language }),
    [aLaVenta, categoria, busquedaDiferida, language],
  );
  const tipoSeleccionado = tipoDesdeCategoria(categoria) ?? (categoria === "Todos" ? "todos" : tipoVino(categoria));
  const denominaciones = useMemo(() => {
    const cantidades = new Map<string, number>();
    for (const vino of aLaVenta) {
      if (vino.categoria && tipoVino(vino.categoria) === tipoSeleccionado) {
        cantidades.set(vino.categoria, (cantidades.get(vino.categoria) ?? 0) + 1);
      }
    }
    return Array.from(cantidades, ([valor, cantidad]) => ({ valor, etiqueta: categoriaCorta(valor, language), cantidad }));
  }, [aLaVenta, tipoSeleccionado, language]);

  return (
    <>
      <Seo
        title={textos.seo.title}
        description={textos.seo.description}
        canonical={url}
        lang={language}
        languageAlternates={alternatesDePagina(RUTA_ES, SITE_URL)}
        keywords={textos.seo.keywords}
        // La tienda solo existe en la demo (`TIENDA_VISIBLE`): que ningún buscador
        // la guarde ni siga sus enlaces.
        noindex
        nofollow
      />
      <JsonLd data={breadcrumbSchema([{ nombre: textos.miga, path: RUTA_ES }], language)} />

      <CartaPageLayout
        titulo={textos.titulo}
        migas={[{ nombre: textos.miga }]}
        volverA={null}
      >
        {pendiente ? (
          <p role="status" className="flex items-center justify-center gap-2 py-16 font-sans text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {textos.comprobando}
          </p>
        ) : !activa || !config ? (
          <TiendaCerrada textos={textos} language={language} aviso={config?.aviso ?? null} />
        ) : (
          <div className="space-y-10">
            {config.aviso && (
              <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4 font-sans text-sm leading-relaxed text-foreground">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <p className="min-w-0 whitespace-pre-line">
                  <span className="sr-only">{textos.aviso}: </span>
                  {config.aviso}
                </p>
              </div>
            )}

            <ComoComprarTienda textos={textos} recogida={config.recogida} vinos={aLaVenta.length} />

            <section aria-labelledby="tienda-listado" className="min-w-0 space-y-6 font-sans">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="tienda-listado" className="font-libre-baskerville text-2xl font-bold text-primary">
                  {textos.listado.titulo}
                </h2>
                <p aria-live="polite" className="text-sm text-muted-foreground">
                  {textos.listado.resultados(filtrados.length)}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    type="search"
                    aria-label={textos.listado.buscar}
                    placeholder={textos.listado.buscar}
                    value={busqueda}
                    onChange={(evento) => setBusqueda(evento.target.value)}
                    className="h-11 pl-10 font-sans text-base"
                  />
                </div>

                {aLaVenta.length > 0 && (
                  // Alineadas a la izquierda, con el buscador (en la carta van centradas).
                  <div className="flex min-w-0 flex-col gap-3 [&>div]:mx-0">
                    <FiltrosTipoVino
                      vinos={aLaVenta}
                      seleccionado={tipoSeleccionado}
                      onChange={(tipo) => setCategoria(tipo === "todos" ? "Todos" : `tipo:${tipo}`)}
                    />
                    {tipoSeleccionado !== "todos" && denominaciones.length > 1 && (
                      <BarraFiltrosVino
                        key={tipoSeleccionado}
                        etiqueta={textos.listado.filtroDenominacion}
                        seleccionado={categoria}
                        onChange={setCategoria}
                        opciones={[
                          {
                            valor: `tipo:${tipoSeleccionado}`,
                            etiqueta: textos.listado.todos,
                            cantidad: denominaciones.reduce((total, d) => total + d.cantidad, 0),
                          },
                          ...denominaciones,
                        ]}
                      />
                    )}
                  </div>
                )}
              </div>

              {filtrados.length === 0 ? (
                <div className="space-y-4 rounded-xl border border-dashed border-border py-12 text-center">
                  <p className="text-lg text-muted-foreground">{textos.listado.vacio}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setBusqueda("");
                      setCategoria("Todos");
                    }}
                  >
                    {textos.listado.limpiar}
                  </Button>
                </div>
              ) : (
                <ul className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {filtrados.slice(0, visibles).map((vino) => (
                    <li key={String(vino.id)} className="min-w-0">
                      <TarjetaVinoTienda vino={vino} language={language} textos={textos} descuentoPct={descuento} />
                    </li>
                  ))}
                </ul>
              )}

              {filtrados.length > visibles && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 whitespace-normal rounded-full px-6"
                    onClick={() => setVisibles((n) => n + POR_PAGINA)}
                  >
                    {textos.listado.mostrarMas(filtrados.length - visibles)}
                  </Button>
                </div>
              )}

              <p className="border-t border-border pt-6 text-center text-sm leading-relaxed text-muted-foreground">
                <ConTelefono texto={textos.listado.final} />
              </p>
            </section>
          </div>
        )}
      </CartaPageLayout>
    </>
  );
};

export default TiendaPagina;
