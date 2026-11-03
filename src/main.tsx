import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import "./index.css";
// Estética de Navidad: CSS real en la demo, vacío en producción (`vite.config.ts`).
import "virtual:navidad.css";

// Entry de vite-react-ssg: monta/hidrata en cliente y prerenderiza en build.
// El HelmetProvider lo aporta vite-react-ssg internamente (componente <Head />).
export const createRoot = ViteReactSSG({ routes });
