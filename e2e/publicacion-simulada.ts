/**
 * Publicaciones simuladas para los e2e de «pestaña con una versión antigua»
 * (`version-nueva.e2e.ts`). Dos piezas:
 *
 *  · `servirComoVercel`: servidor estático que se comporta como Vercel con
 *    `vercel.json` (cleanUrls, `404.html` con estado 404 para lo que no existe,
 *    HTML sin caché y `/assets` inmutable). La carpeta servida se cambia de
 *    golpe con `publicar(dir)`, como un despliegue atómico.
 *  · `copiarComoBuildNueva`: a partir del `dist-e2e/` real fabrica OTRA build
 *    del mismo commit, como las que lanza el panel al guardar la carta
 *    (deploy hook): todos los JS y CSS de `/assets` cambian de nombre (hash
 *    nuevo), y también el hash del SSG (`__VITE_REACT_SSG_HASH__`, los
 *    `static-loader-data`) y el id de build de `/version.json`. Los ficheros de
 *    la build anterior desaparecen al publicar la nueva.
 *
 * Así no hace falta compilar dos veces (unos 25 s cada una) para tener dos
 * builds distintas de verdad.
 */
import http from "node:http";
import { cp, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".mp4": "video/mp4",
};

async function esFichero(ruta: string): Promise<boolean> {
  try {
    return (await stat(ruta)).isFile();
  } catch {
    return false;
  }
}

export interface ServidorVercel {
  url: string;
  /** Cambia la carpeta servida (despliegue atómico). */
  publicar: (dir: string) => void;
  /** Peticiones de documento (cargas y recargas de página) desde que arrancó. */
  documentos: string[];
  /** Rutas (sin consulta) que acabaron en 404. */
  noEncontrados: string[];
  cerrar: () => Promise<void>;
}

/** Servidor estático con las reglas de Vercel que importan aquí (ver `vercel.json`). */
export async function servirComoVercel(dirInicial: string): Promise<ServidorVercel> {
  let raiz = dirInicial;
  const documentos: string[] = [];
  const noEncontrados: string[] = [];
  const servidor = http.createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    if (req.headers["sec-fetch-dest"] === "document") documentos.push(ruta);
    const candidatos = ruta === "/" ? ["index.html"] : path.extname(ruta) ? [ruta] : [`${ruta}.html`, ruta];
    for (const c of candidatos) {
      const fichero = path.join(raiz, c);
      if (!fichero.startsWith(raiz) || !(await esFichero(fichero))) continue;
      const ext = path.extname(fichero);
      res.writeHead(200, {
        "Content-Type": TIPOS[ext] ?? "application/octet-stream",
        "Cache-Control": ruta.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
      });
      res.end(await readFile(fichero));
      return;
    }
    noEncontrados.push(ruta);
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" });
    res.end(await readFile(path.join(raiz, "404.html")).catch(() => "404"));
  });
  await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
  const { port } = servidor.address() as { port: number };
  return {
    url: `http://127.0.0.1:${port}`,
    publicar: (dir) => {
      raiz = dir;
    },
    documentos,
    noEncontrados,
    cerrar: () => new Promise<void>((ok) => servidor.close(() => ok())),
  };
}

async function ficheros(dir: string): Promise<string[]> {
  const salida: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await ficheros(ruta)));
    else salida.push(ruta);
  }
  return salida;
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RE_HASH_SSG = /__VITE_REACT_SSG_HASH__ = '([a-z0-9]+)'/;

export interface OpcionesBuild {
  /** Sufijo para los nombres nuevos (distinto en cada build). */
  sufijo: string;
  /** JS/CSS de la build nueva que se quitan (para simular una build que tampoco carga). */
  borrar?: RegExp;
  /** false: mismos `/assets` que la anterior, solo cambia el SSG (una build sin cambios de código ni datos). */
  renombrarAssets?: boolean;
}

/**
 * Copia `origen` (una build) en una carpeta temporal nueva convertida en OTRA
 * build del mismo commit. Devuelve la carpeta.
 */
export async function copiarComoBuildNueva(origen: string, { sufijo, borrar, renombrarAssets = true }: OpcionesBuild): Promise<string> {
  const destino = await mkdtemp(path.join(tmpdir(), "ct-build-"));
  await cp(origen, destino, { recursive: true });
  const cambios = new Map<string, string>();

  if (renombrarAssets) {
    for (const nombre of await readdir(path.join(destino, "assets"))) {
      // Hash de Vite (8 caracteres) o el de una copia anterior (con sufijo): siempre tras el último «-» válido.
      const m = /^(.+-[A-Za-z0-9_-]{8,})(\.(?:js|css))$/.exec(nombre);
      if (!m) continue;
      const nuevo = `${m[1]}${sufijo}${m[2]}`;
      cambios.set(nombre, nuevo);
      await rename(path.join(destino, "assets", nombre), path.join(destino, "assets", nuevo));
    }
  }

  const indice = await readFile(path.join(destino, "index.html"), "utf8");
  const hashViejo = RE_HASH_SSG.exec(indice)?.[1];
  if (!hashViejo) throw new Error("index.html sin __VITE_REACT_SSG_HASH__");
  const hashNuevo = `${hashViejo.slice(0, 6)}${sufijo}`.toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(10, "x").slice(0, 10);
  for (const f of await ficheros(destino)) {
    const base = path.basename(f);
    if (base.includes(`.${hashViejo}.json`) || base === `static-loader-data-manifest-${hashViejo}.json`) {
      await rename(f, f.replace(new RegExp(`${escapar(hashViejo)}(\\.json)$`), `${hashNuevo}$1`));
    }
  }

  const reNombres = cambios.size ? new RegExp([...cambios.keys()].sort((a, b) => b.length - a.length).map(escapar).join("|"), "g") : null;
  for (const f of await ficheros(destino)) {
    if (!/\.(html|js|css|json)$/.test(f)) continue;
    const texto = await readFile(f, "utf8");
    let nuevo = reNombres ? texto.replace(reNombres, (n) => cambios.get(n)!) : texto;
    nuevo = nuevo.split(hashViejo).join(hashNuevo);
    if (nuevo !== texto) await writeFile(f, nuevo);
  }

  // Id de esta build en /version.json (el commit y la versión no cambian: es un rebuild).
  const fVersion = path.join(destino, "version.json");
  if (await esFichero(fVersion)) {
    const v = JSON.parse(await readFile(fVersion, "utf8"));
    await writeFile(fVersion, JSON.stringify({ ...v, build: hashNuevo }));
  }

  if (borrar) {
    for (const nombre of await readdir(path.join(destino, "assets"))) {
      if (borrar.test(nombre)) await rm(path.join(destino, "assets", nombre));
    }
  }
  return destino;
}

/** Copia la build tal cual en una carpeta temporal (la «versión A», que luego se borra). */
export async function copiarBuild(origen: string): Promise<string> {
  const destino = await mkdtemp(path.join(tmpdir(), "ct-build-"));
  await cp(origen, destino, { recursive: true });
  return destino;
}

export const borrarBuild = (dir: string) => rm(dir, { recursive: true, force: true });

/**
 * Una caché vieja por delante de la build nueva (lo que ve una pestaña a la
 * que el navegador le sirve el HTML de antes, p. ej. al restaurarla): copia de
 * `nueva` donde `paginas` son las de `vieja` y están los `/assets` de `vieja`
 * (los que tendría en caché), salvo los que nunca descargó (`faltan`).
 * `/version.json` sigue siendo el de la nueva.
 */
export async function copiarConCacheVieja(nueva: string, vieja: string, { paginas, faltan }: { paginas: string[]; faltan: RegExp }): Promise<string> {
  const destino = await copiarBuild(nueva);
  for (const nombre of await readdir(path.join(vieja, "assets"))) {
    if (!faltan.test(nombre)) await cp(path.join(vieja, "assets", nombre), path.join(destino, "assets", nombre));
  }
  for (const p of paginas) await cp(path.join(vieja, p), path.join(destino, p));
  return destino;
}
