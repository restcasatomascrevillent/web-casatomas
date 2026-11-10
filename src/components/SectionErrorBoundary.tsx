import { Component, type ReactNode } from "react";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { registrarActividad } from "@/lib/actividad/registro";
import { esErrorDeVersionAntigua, recargarUnaVez } from "@/lib/recarga-por-version";

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
 * La recarga automática (una por versión) vive en `@/lib/recarga-por-version`.
 */

interface BoundaryProps {
  id?: string;
  mensaje: string;
  boton: string;
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

class ErrorBoundaryBase extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info?: { componentStack?: string | null }) {
    // Super Admin › Logs: el fallo de pintado, con su pila (se sanea en el servidor).
    registrarActividad("error_react", {
      objetivo: this.props.id ?? "app",
      props: { componente: this.props.id ?? "app" },
      error: {
        mensaje: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        pila: error instanceof Error ? `${error.stack ?? ""}${info?.componentStack ? `\n${info.componentStack}` : ""}` : undefined,
      },
    });
    if (typeof window === "undefined" || !esErrorDeVersionAntigua(error)) return;
    // Una sola recarga por versión de la web (marca con el commit de la build).
    recargarUnaVez();
  }

  render() {
    if (this.state.failed) {
      return (
        <section id={this.props.id} className="py-16 px-4 text-center text-muted-foreground">
          <p className="mb-3">{this.props.mensaje}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline underline-offset-4 hover:text-foreground"
          >
            {this.props.boton}
          </button>
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
    <ErrorBoundaryBase id={id} mensaje={textos.mensaje} boton={textos.boton}>
      {children}
    </ErrorBoundaryBase>
  );
};
