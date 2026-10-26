#!/usr/bin/env node
// Sube los secretos de las Edge Functions al proyecto destino y deja escrito
// el SQL que carga los mismos valores en el Vault (los cron y las funciones
// SQL los leen de ahí: tienen que coincidir con los de las funciones).
//
// Supabase no deja leer los valores de los secretos de ningún proyecto (la API
// solo devuelve un resumen), así que los valores externos (Stripe, Resend,
// OpenAI, Google…) llegan en SECRETOS_FUNCIONES con formato .env. Los secretos
// internos (HMAC de enlaces y cabeceras de cron) se generan si no vienen.
//
// Variables:
//   DESTINO_REF, SUPABASE_ACCESS_TOKEN          proyecto y token de la cuenta del restaurante
//   SECRETOS_FUNCIONES                          contenido .env (puede estar vacío)
//   ORIGEN_REF, REEMPLAZOS                      para corregir URLs dentro de los valores
//   SUPABASE_ACCESS_TOKEN_ORIGEN (opcional)     para avisar de nombres que faltan respecto al origen
//   VAULT_SQL                                   ruta donde escribir el SQL del Vault
//
// Nunca imprime valores: solo nombres.

import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const API = `${process.env.SUPABASE_API_URL ?? "https://api.supabase.com"}/v1`;
const {
  DESTINO_REF,
  SUPABASE_ACCESS_TOKEN,
  SECRETOS_FUNCIONES = "",
  ORIGEN_REF = "jeamoczmbfsnwkfjxcyo",
  REEMPLAZOS = "",
  SUPABASE_ACCESS_TOKEN_ORIGEN,
  VAULT_SQL,
} = process.env;

if (!DESTINO_REF || !SUPABASE_ACCESS_TOKEN || !VAULT_SQL) {
  console.error("Faltan DESTINO_REF, SUPABASE_ACCESS_TOKEN o VAULT_SQL");
  process.exit(2);
}

/** Secretos que solo se usan entre piezas de Casa Tomás: se pueden generar. */
const INTERNOS = [
  "EMAILS_RESERVA_SHARED_SECRET",
  "EMAILS_RESERVA_TOKEN_SECRET",
  "RESERVAS_WEB_TOKEN_SECRET",
  "OCR_TRABAJOS_SECRET",
  "TRAFICO_WEB_CRON_SECRET",
  "NEWSLETTER_UNSUB_SECRET",
  "NEWSLETTER_SYNC_CRON_SECRET",
  "CHAT_WEB_SESSION_SECRET",
  "CHAT_WEB_IP_SALT",
];

/** Vault del destino ← secreto de las funciones (ver cron.job y las funciones *_despachar). */
const VAULT = {
  emails_reserva_cron_secret: "EMAILS_RESERVA_SHARED_SECRET",
  ocr_trabajos_secret: "OCR_TRABAJOS_SECRET",
  trafico_web_cron_secret: "TRAFICO_WEB_CRON_SECRET",
};

function leerEnv(texto) {
  const salida = new Map();
  for (const lineaCruda of texto.split(/\r?\n/)) {
    const linea = lineaCruda.trim();
    if (!linea || linea.startsWith("#")) continue;
    const m = linea.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) {
      console.error("Línea .env ignorada (no es NOMBRE=valor)");
      continue;
    }
    let valor = m[2];
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    salida.set(m[1], valor);
  }
  return salida;
}

const pares = [[`${ORIGEN_REF}.supabase.co`, `${DESTINO_REF}.supabase.co`]];
for (const par of REEMPLAZOS.split(";")) {
  const [antes, despues] = par.split("=>").map((s) => s?.trim());
  if (antes && despues) pares.push([antes, despues]);
}
const corregir = (valor) => pares.reduce((v, [a, d]) => v.split(a).join(d), valor);

const secretos = leerEnv(SECRETOS_FUNCIONES);
// La plataforma inyecta las suyas; no se pueden (ni deben) definir a mano.
for (const nombre of [...secretos.keys()]) if (nombre.startsWith("SUPABASE_")) secretos.delete(nombre);
for (const [nombre, valor] of secretos) secretos.set(nombre, corregir(valor));

const generados = [];
for (const nombre of INTERNOS) {
  if (!secretos.get(nombre)) {
    secretos.set(nombre, randomBytes(36).toString("base64url"));
    generados.push(nombre);
  }
}

// RESERVAS_WEB_SHARED_SECRET tira el formulario de reservas de la web si se
// define (docs/DESPLIEGUE.md del panel, §0.0): solo pasa si viene a propósito.
if (secretos.has("RESERVAS_WEB_SHARED_SECRET")) {
  console.warn("AVISO: se define RESERVAS_WEB_SHARED_SECRET; la web debe mandar x-webhook-secret o las reservas darán 401.");
}

const respuesta = await fetch(`${API}/projects/${DESTINO_REF}/secrets`, {
  method: "POST",
  headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify([...secretos].map(([name, value]) => ({ name, value }))),
});
if (!respuesta.ok) {
  console.error(`No se pudieron guardar los secretos: HTTP ${respuesta.status} ${(await respuesta.text()).slice(0, 300)}`);
  process.exit(1);
}
console.log(`Secretos guardados en ${DESTINO_REF}: ${[...secretos.keys()].sort().join(", ")}`);
if (generados.length) console.log(`Generados ahora (no venían): ${generados.join(", ")}`);

if (SUPABASE_ACCESS_TOKEN_ORIGEN) {
  const r = await fetch(`${API}/projects/${ORIGEN_REF}/secrets`, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN_ORIGEN}` },
  });
  if (r.ok) {
    const enOrigen = (await r.json()).map((s) => s.name).filter((n) => !n.startsWith("SUPABASE_"));
    const faltan = enOrigen.filter((n) => !secretos.has(n));
    console.log(faltan.length
      ? `AVISO: el origen tiene estos secretos y el destino no: ${faltan.sort().join(", ")}`
      : "Mismos nombres de secretos que el origen.");
  } else {
    console.warn(`No se pudo leer la lista de secretos del origen (HTTP ${r.status}).`);
  }
}

const literal = (v) => `'${v.replaceAll("'", "''")}'`;
const sql = [
  "\\set ON_ERROR_STOP on",
  "begin;",
  ...Object.entries(VAULT).map(([nombreVault, secreto]) => {
    const valor = literal(secretos.get(secreto));
    return (
      `select case when exists (select 1 from vault.secrets where name = '${nombreVault}')\n` +
      `  then (select vault.update_secret(id, ${valor}) from vault.secrets where name = '${nombreVault}')::text\n` +
      `  else vault.create_secret(${valor}, '${nombreVault}')::text end \\g /dev/null`
    );
  }),
  "commit;",
  "",
].join("\n");
writeFileSync(VAULT_SQL, sql, { mode: 0o600 });
console.log(`Vault: ${Object.keys(VAULT).join(", ")} preparados.`);
