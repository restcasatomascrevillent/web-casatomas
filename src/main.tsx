import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import "./index.css";
import { instalarRecargaPorVersion } from "./lib/recarga-por-version";

// Pestaña con una versión antigua: si un import() dinámico falla tras una
// release, recarga una vez para traer la nueva (ver lib/recarga-por-version).
if (typeof window !== "undefined") instalarRecargaPorVersion();

// Entry de vite-react-ssg: monta/hidrata en cliente y prerenderiza en build.
// El HelmetProvider lo aporta vite-react-ssg internamente (componente <Head />).
export const createRoot = ViteReactSSG({ routes });
