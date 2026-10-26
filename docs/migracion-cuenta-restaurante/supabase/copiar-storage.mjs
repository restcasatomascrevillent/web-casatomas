#!/usr/bin/env node
// Copia los ficheros de todos los buckets de Storage del proyecto origen al
// destino, con la API REST de Storage (sin dependencias, Node 20+).
//
// Solo LEE del origen. En el destino crea los buckets que falten (mismo
// public / límite de tamaño / tipos MIME) y sube cada objeto con upsert, así
// que se puede relanzar: lo ya copiado se vuelve a escribir igual.
//
// Variables:
//   ORIGEN_URL, ORIGEN_SERVICE_KEY     https://<ref>.supabase.co y su clave secreta (service_role / sb_secret_)
//   DESTINO_URL, DESTINO_SERVICE_KEY   lo mismo del destino
//   CONCURRENCIA                       subidas en paralelo (4 por defecto)
//
// Solo imprime recuentos por bucket y las rutas que fallen.

const {
  ORIGEN_URL,
  ORIGEN_SERVICE_KEY,
  DESTINO_URL,
  DESTINO_SERVICE_KEY,
  CONCURRENCIA = "4",
} = process.env;

for (const [nombre, valor] of Object.entries({ ORIGEN_URL, ORIGEN_SERVICE_KEY, DESTINO_URL, DESTINO_SERVICE_KEY })) {
  if (!valor) {
    console.error(`Falta ${nombre}`);
    process.exit(2);
  }
}

const cabeceras = (clave) => ({ apikey: clave, Authorization: `Bearer ${clave}` });
const origen = { base: ORIGEN_URL.replace(/\/+$/, ""), clave: ORIGEN_SERVICE_KEY };
const destino = { base: DESTINO_URL.replace(/\/+$/, ""), clave: DESTINO_SERVICE_KEY };
const rutaUrl = (ruta) => ruta.split("/").map(encodeURIComponent).join("/");

async function api(proyecto, metodo, ruta, cuerpo) {
  const respuesta = await fetch(`${proyecto.base}/storage/v1${ruta}`, {
    method: metodo,
    headers: { ...cabeceras(proyecto.clave), ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await respuesta.text();
  if (!respuesta.ok) {
    const error = new Error(`${metodo} ${ruta} → HTTP ${respuesta.status}: ${texto.slice(0, 200)}`);
    error.status = respuesta.status;
    error.cuerpo = texto;
    throw error;
  }
  return texto ? JSON.parse(texto) : null;
}

/** Lista recursiva: en la API de Storage las "carpetas" llegan con id null. */
async function listar(bucket, prefijo = "") {
  const objetos = [];
  for (let offset = 0; ; offset += 1000) {
    const pagina = await api(origen, "POST", `/object/list/${encodeURIComponent(bucket)}`, {
      prefix: prefijo,
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    for (const entrada of pagina) {
      const ruta = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
      if (entrada.id === null) objetos.push(...(await listar(bucket, ruta)));
      else objetos.push({ ruta, metadata: entrada.metadata ?? {} });
    }
    if (pagina.length < 1000) break;
  }
  return objetos;
}

async function asegurarBucket(bucket) {
  try {
    await api(destino, "GET", `/bucket/${encodeURIComponent(bucket.id)}`);
    await api(destino, "PUT", `/bucket/${encodeURIComponent(bucket.id)}`, {
      public: bucket.public,
      file_size_limit: bucket.file_size_limit,
      allowed_mime_types: bucket.allowed_mime_types,
    });
  } catch (error) {
    if (error.status !== 400 && error.status !== 404) throw error;
    await api(destino, "POST", "/bucket", {
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      file_size_limit: bucket.file_size_limit,
      allowed_mime_types: bucket.allowed_mime_types,
    });
  }
}

async function copiarObjeto(bucket, { ruta, metadata }) {
  const descarga = await fetch(`${origen.base}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${rutaUrl(ruta)}`, {
    headers: cabeceras(origen.clave),
  });
  if (!descarga.ok) throw new Error(`descarga HTTP ${descarga.status}`);
  const contenido = Buffer.from(await descarga.arrayBuffer());
  const subida = await fetch(`${destino.base}/storage/v1/object/${encodeURIComponent(bucket)}/${rutaUrl(ruta)}`, {
    method: "POST",
    headers: {
      ...cabeceras(destino.clave),
      "Content-Type": metadata.mimetype || descarga.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": metadata.cacheControl || "max-age=3600",
      "x-upsert": "true",
    },
    body: contenido,
  });
  if (!subida.ok) throw new Error(`subida HTTP ${subida.status}: ${(await subida.text()).slice(0, 200)}`);
  return contenido.length;
}

async function enParalelo(tareas, limite) {
  const resultados = [];
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await tareas[i]().then(
        (valor) => ({ ok: true, valor }),
        (error) => ({ ok: false, error }),
      );
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Number(limite) || 4) }, trabajador));
  return resultados;
}

const buckets = await api(origen, "GET", "/bucket");
let fallos = 0;
for (const bucket of buckets) {
  await asegurarBucket(bucket);
  const objetos = await listar(bucket.id);
  const resultados = await enParalelo(objetos.map((objeto) => () => copiarObjeto(bucket.id, objeto)), CONCURRENCIA);
  const copiados = resultados.filter((r) => r.ok);
  const bytes = copiados.reduce((suma, r) => suma + r.valor, 0);
  console.log(`${bucket.id}: ${copiados.length}/${objetos.length} objetos (${(bytes / 1048576).toFixed(1)} MB)`);
  resultados.forEach((r, i) => {
    if (!r.ok) {
      fallos++;
      console.error(`  FALLO ${bucket.id}/${objetos[i].ruta}: ${r.error.message}`);
    }
  });
}
if (fallos) {
  console.error(`${fallos} objeto(s) sin copiar; relanzar el paso storage los reintenta.`);
  process.exit(1);
}
