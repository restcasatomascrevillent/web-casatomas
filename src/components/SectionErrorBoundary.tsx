import { Component, type ReactNode } from "react";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { registrarActividad } from "@/lib/actividad/registro";
import { esErrorDeVersionAntigua, registrarFalloDeCarga } from "@/lib/recarga-por-version";
import { MensajeFalloCarga } from "@/components/AvisoVersionNueva";

const TEXTOS: Record<Language, { mensaje: string; boton: string }> = {
  es: { mensaje: "No se pudo cargar esta sección.", boton: "Recargar página" },
  en: { mensaje: "This section couldn't load.", boton: "Reload page" },
  fr: { mensaje: "Cette section n'a pas pu être chargée.", boton: "Recharger la page" },
};

/**
 * Tras cada despliegue, los chunks de la build anterior dejan de existir
 * (hash inmutable en `/assets` — ver `vite.config.ts`). Una pestaña que
 * quedó abierta desde antes, o una conexión que corta la descarga a medias,
 * hace que el `import()` perezoso de una sección rechace — y sin nada que
 * recoja ese error, `Suspense` deja su esqueleto de carga en pantalla para
 * siempre: la sección se queda a medias y el resto de la página sigue
 * funcionando, dando la sensación de que "no cargó bien".
 * La recarga automática (o el aviso «Hay una versión nueva de la web») vive en
 * `@/lib/recarga-por-version`.
 */

interface BoundaryProps {
  id?: string;
  idioma: Language;
  mensaje: string;
  boton: string;
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
  porVersion: boolean;
}

class ErrorBoundaryBase extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, porVersion: false };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { failed: true, porVersion: esErrorDeVersionAntigua(error) };
  }

  componentDidCatch(error: unknown, info?: { componentStack?: string | null }) {
    // Super Admin › Logs: el fallo de pintado, con su pila (se sanea en el servidor).
    const evento = {
      objetivo: this.props.id ?? "app",
      props: { componente: this.props.id ?? "app" },
      error: {
        mensaje: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        pila: error instanceof Error ? `${error.stack ?? ""}${info?.componentStack ? `\n${info.componentStack}` : ""}` : undefined,
      },
    };
    // Versión antigua: recarga una vez por build nueva o avisa. Si recarga, el
    // evento sale al volver, marcado como recuperado; si no, ahora con su marca.
    if (esErrorDeVersionAntigua(error)) void registrarFalloDeCarga("error_react", evento, error);
    else registrarActividad("error_react", evento);
  }

  render() {
    if (this.state.failed) {
      return (
        <section id={this.props.id} className="py-16 px-4 text-center text-muted-foreground">
          <MensajeFalloCarga porVersion={this.state.porVersion} idioma={this.props.idioma} mensaje={this.props.mensaje} boton={this.props.boton} />
        </section>
      );
    }
    return this.props.children;
  }
}

export const SectionErrorBoundary = ({ id, children }: { id?: string; children: ReactNode }) => {
  const { language } = useTranslations();
  const textos = TEXTOS[language];
  return (
    <ErrorBoundaryBase id={id} idioma={language} mensaje={textos.mensaje} boton={textos.boton}>
      {children}
    </ErrorBoundaryBase>
  );
};
