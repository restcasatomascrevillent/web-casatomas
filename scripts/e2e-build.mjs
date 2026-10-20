// ============================================================================
// Build SSG para los E2E de Playwright, SIN tocar Supabase.
// ----------------------------------------------------------------------------
// El build normal descarga la carta y las novedades de Supabase (y se rompe sin
// credenciales). Para los E2E se levanta aquí un servidor HTTP local que
// responde a `/rest/v1/...` (una fila de prueba para Platos/Vinos/Bebidas, que el
// build exige no vacías, y `[]` para todo lo demás), se apunta VITE_SUPABASE_URL a él y
// se construye en `dist-e2e/` (vite.config.e2e.ts). Así:
//   · el build no depende de la red ni de producción;
//   · el bundle resultante apunta a http://127.0.0.1:<E2E_SUPABASE_PORT>, una
//     dirección que en el navegador SOLO atienden las rutas `page.route` de
//     los tests (la de reservas-web incluida): nunca se llama al backend real.
// Uso: `npm run test:e2e` (lo ejecuta antes de `playwright test`).
// ============================================================================
import http from "node:http";
import { spawn } from "node:child_process";

const PUERTO = Number(process.env.E2E_SUPABASE_PORT ?? 54329);
const URL_FALSA = `http://127.0.0.1:${PUERTO}`;

/** Una fila mínima por tabla de la carta: `carta-ssg` aborta el build si alguna llega vacía. */
const FILA_CARTA = {
  Platos: { id: 1, nombre: "Plato E2E", categoria: "Entrantes", precio_eur: 10, descripcion: "Fila de prueba de los E2E" },
  Vinos: { id: 1, nombre: "Vino E2E", categoria: "Tintos", precio_eur: 20, ubicacion_pais: "España" },
  Bebidas: { id: 1, nombre: "Bebida E2E", categoria: "Refrescos", precio_eur: 2 },
};

const servidor = http.createServer((req, res) => {
  const tabla = /^\/rest\/v1\/([^?/]+)/.exec(req.url ?? "")?.[1];
  const fila = tabla ? FILA_CARTA[tabla] : undefined;
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(fila ? [fila] : []));
});
await new Promise((ok, ko) => {
  servidor.once("error", ko);
  servidor.listen(PUERTO, "127.0.0.1", ok);
});
console.log(`[e2e-build] Supabase de mentira en ${URL_FALSA}`);

const codigo = await new Promise((ok) => {
  const hijo = spawn("npx", ["vite-react-ssg", "build", "-c", "vite.config.e2e.ts"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      // Pisan a cualquier .env local: process.env gana en loadEnv de Vite.
      VITE_SUPABASE_URL: URL_FALSA,
      VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-clave-publica-falsa",
      VITE_SUPABASE_ANON_KEY: "e2e-clave-publica-falsa",
    },
  });
  hijo.on("exit", (c) => ok(c ?? 1));
});

servidor.close();
process.exit(codigo);
