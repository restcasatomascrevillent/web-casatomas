import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import "./index.css";
import { instalarRecargaPorVersion } from "./lib/recarga-por-version";
import { instalarProteccionDomTraductor } from "./lib/proteger-dom-traductor";
import { crearRouterCliente } from "./lib/router-cliente";
import { SIN_CONTENEDOR, irADireccionCanonicaEnElNavegador } from "./lib/direccion-canonica";

// `/Carta`, `/carta//vinos`…: Vercel sirve otro HTML del que montaría el router
// (errores de hidratación). Se va a la dirección canónica sin montar React
// (ver lib/direccion-canonica).
const redirigiendo = irADireccionCanonicaEnElNavegador();

if (typeof window !== "undefined" && !redirigiendo) {
  // Página traducida por el navegador: que React no la tire al quitar un texto
  // que el traductor ya cambió (CAS-13, ver lib/proteger-dom-traductor).
  instalarProteccionDomTraductor();
  // Pestaña con una versión antigua: si un import() dinámico falla tras una
  // publicación, recarga una vez o avisa (ver lib/recarga-por-version).
  instalarRecargaPorVersion();
}

// Entry de vite-react-ssg: monta/hidrata en cliente y prerenderiza en build.
// El HelmetProvider lo aporta vite-react-ssg internamente (componente <Head />).
// `customCreateRouter`: sin los cargadores estáticos de vite-react-ssg (ver lib/router-cliente).
export const createRoot = ViteReactSSG(
  { routes, customCreateRouter: crearRouterCliente },
  undefined,
  redirigiendo ? { rootContainer: SIN_CONTENEDOR } : undefined,
);
