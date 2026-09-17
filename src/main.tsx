import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./App";
import "./index.css";

// Entry de vite-react-ssg: monta/hidrata en cliente y prerenderiza en build.
// El HelmetProvider lo aporta vite-react-ssg internamente (componente <Head />).
export const createRoot = ViteReactSSG({ routes });
