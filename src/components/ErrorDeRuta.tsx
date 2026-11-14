import { useEffect, useRef } from "react";
import { useLocation, useRouteError } from "react-router-dom";
import { idiomaDeRuta } from "@/i18n/routing";
import { registrarActividad } from "@/lib/actividad/registro";
import { esErrorDeVersionAntigua, registrarFalloDeCarga } from "@/lib/recarga-por-version";
import { TEXTOS_VERSION_NUEVA } from "@/lib/textos-version-nueva";
import { ID_CONTENIDO } from "@/components/SaltarAlContenido";
import { MensajeFalloCarga } from "@/components/AvisoVersionNueva";

/**
 * `errorElement` de todas las rutas (`App.tsx`). Sin él, react-router pinta su
 * pantalla de desarrollador («Unexpected Application Error!») y el fallo no
 * llega a Super Admin › Logs. Lo normal aquí es una página que no cargó al
 * navegar porque la pestaña tiene una versión antigua: la decisión de recargar
 * o avisar es la de `lib/recarga-por-version`.
 *
 * Puede montarse fuera del `Layout` (si falla el propio Layout): no usa
 * `LanguageProvider`; el idioma sale de la URL.
 */
export default function ErrorDeRuta() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const idioma = idiomaDeRuta(pathname);
  const textos = TEXTOS_VERSION_NUEVA[idioma];
  const porVersion = esErrorDeVersionAntigua(error);
  const registrado = useRef<unknown>(null);

  useEffect(() => {
    if (registrado.current === error) return;
    registrado.current = error;
    const evento = {
      objetivo: "ruta",
      props: { componente: "ruta" },
      error: {
        mensaje: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        pila: error instanceof Error ? error.stack : undefined,
      },
    };
    if (porVersion) void registrarFalloDeCarga("error_react", evento, error);
    else registrarActividad("error_react", evento);
  }, [error, porVersion]);

  return (
    <main id={ID_CONTENIDO} tabIndex={-1} className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center text-muted-foreground">
      <MensajeFalloCarga porVersion={porVersion} idioma={idioma} mensaje={textos.falloPagina} boton={textos.recargar} />
    </main>
  );
}
