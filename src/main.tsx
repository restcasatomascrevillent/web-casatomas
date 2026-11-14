import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import "./index.css";
import { instalarRecargaPorVersion } from "./lib/recarga-por-version";
import { crearRouterCliente } from "./lib/router-cliente";

// Pestaña con una versión antigua: si un import() dinámico falla tras una
// publicación, recarga una vez o avisa (ver lib/recarga-por-version).
if (typeof window !== "undefined") instalarRecargaPorVersion();

// Entry de vite-react-ssg: monta/hidrata en cliente y prerenderiza en build.
// El HelmetProvider lo aporta vite-react-ssg internamente (componente <Head />).
// `customCreateRouter`: sin los cargadores estáticos de vite-react-ssg (ver lib/router-cliente).
export const createRoot = ViteReactSSG({ routes, customCreateRouter: crearRouterCliente });
