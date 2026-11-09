import { Component, type ReactNode } from "react";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { Language } from "@/i18n/types";
import { registrarActividad } from "@/lib/actividad/registro";

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
 */
const esErrorDeChunk = (error: unknown): boolean => {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(
    mensaje,
  );
};

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
    if (typeof window === "undefined" || !esErrorDeChunk(error)) return;

    // Un solo recargado automático: si el chunk falló porque el despliegue
    // avanzó, la nueva `index.html` trae los hashes correctos y se resuelve
    // solo. La marca en `sessionStorage` evita un bucle si el chunk sigue
    // sin poder descargarse (p. ej. sin red de verdad).
    const key = `chunk-reload:${this.props.id ?? "app"}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Safari privado o almacenamiento bloqueado: se recarga igual, solo
      // sin el cortafuegos anti-bucle (peor caso, un reintento de más).
    }
    window.location.reload();
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
