#!/usr/bin/env node
// Copia la configuración de Supabase Auth del origen al destino (Site URL,
// URLs de redirección permitidas, plantillas y asuntos de correo, SMTP,
// límites, caducidad de sesiones…) con la Management API.
//
// Los campos secretos (contraseña SMTP, secretos de proveedores OAuth,
// captcha, hooks) no se copian: la API no los devuelve en claro. Si el origen
// usa SMTP propio, SMTP_PASS lo aporta.
//
// Variables:
//   ORIGEN_REF, SUPABASE_ACCESS_TOKEN_ORIGEN
//   DESTINO_REF, SUPABASE_ACCESS_TOKEN
//   REEMPLAZOS          "url_vieja=>url_nueva;..." (p. ej. la URL del panel)
//   SMTP_PASS           opcional
//
// Imprime solo nombres de campos.

const API = `${process.env.SUPABASE_API_URL ?? "https://api.supabase.com"}/v1`;
const {
  ORIGEN_REF = "jeamoczmbfsnwkfjxcyo",
  SUPABASE_ACCESS_TOKEN_ORIGEN,
  DESTINO_REF,
  SUPABASE_ACCESS_TOKEN,
  REEMPLAZOS = "",
  SMTP_PASS,
} = process.env;

if (!SUPABASE_ACCESS_TOKEN_ORIGEN || !DESTINO_REF || !SUPABASE_ACCESS_TOKEN) {
  console.error("Faltan SUPABASE_ACCESS_TOKEN_ORIGEN, DESTINO_REF o SUPABASE_ACCESS_TOKEN");
  process.exit(2);
}

const pares = [[`${ORIGEN_REF}.supabase.co`, `${DESTINO_REF}.supabase.co`]];
for (const par of REEMPLAZOS.split(";")) {
  const [antes, despues] = par.split("=>").map((s) => s?.trim());
  if (antes && despues) pares.push([antes, despues]);
}
const corregir = (valor) => pares.reduce((v, [a, d]) => v.split(a).join(d), valor);

const SECRETO = /(secret|pass|password|token|key)$/i;

async function leerAuth(ref, token) {
  const r = await fetch(`${API}/projects/${ref}/config/auth`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    console.error(`No se pudo leer Auth de ${ref}: HTTP ${r.status}`);
    process.exit(1);
  }
  return r.json();
}
const origen = await leerAuth(ORIGEN_REF, SUPABASE_ACCESS_TOKEN_ORIGEN);
const actual = await leerAuth(DESTINO_REF, SUPABASE_ACCESS_TOKEN);

// Solo lo que difiere del destino: así no se mandan valores por defecto de
// opciones de pago (sesiones, HIBP…) que el plan gratuito rechaza aunque coincidan.
const cambios = {};
const omitidos = [];
for (const [campo, valor] of Object.entries(origen)) {
  if (valor === null || valor === undefined) continue;
  // Solo un texto puede ser un secreto: los sí/no y números se copian siempre
  // (p. ej. security_update_password_require_current_password).
  if (SECRETO.test(campo) && typeof valor === "string") {
    omitidos.push(campo);
    continue;
  }
  // Ajuste interno de Supabase, no de la configuración del proyecto.
  if (campo.startsWith("index_worker_")) continue;
  let nuevo = typeof valor === "string" ? corregir(valor) : valor;
  // Las URLs que solo tiene el destino (el panel nuevo) se conservan.
  if (campo === "uri_allow_list") {
    const lista = (texto) => (texto ?? "").split(",").map((u) => u.trim()).filter(Boolean);
    nuevo = [...new Set([...lista(nuevo), ...lista(actual[campo])])].join(",");
  }
  if (JSON.stringify(nuevo) !== JSON.stringify(actual[campo])) cambios[campo] = nuevo;
}

// En el plan gratuito, sin SMTP propio, Supabase rechaza cualquier cambio de
// plantillas o asuntos de correo ("Email template modification is not
// available for free tier projects using the default email provider").
const plantillas = Object.keys(cambios).filter((c) => /^mailer_(templates|subjects)_/.test(c));
const smtpDestino = cambios.smtp_host ?? actual.smtp_host;
if (!smtpDestino && plantillas.length) {
  for (const c of plantillas) delete cambios[c];
  console.log(`Plantillas y asuntos de correo no copiados (${plantillas.length}): el destino usa el correo por defecto de Supabase y en el plan gratuito no se pueden cambiar.`);
}
if (origen.smtp_host && SMTP_PASS) cambios.smtp_pass = SMTP_PASS;

if (!Object.keys(cambios).length) {
  console.log("Auth: el destino ya coincide con el origen.");
  process.exit(0);
}
const escrita = await fetch(`${API}/projects/${DESTINO_REF}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(cambios),
});
if (!escrita.ok) {
  console.error(`No se pudo escribir Auth en el destino: HTTP ${escrita.status} ${(await escrita.text()).slice(0, 400)}`);
  process.exit(1);
}
console.log(`Auth copiada: ${Object.keys(cambios).sort().join(", ")}`);
if (omitidos.length) console.log(`No copiados por ser secretos: ${omitidos.join(", ")}`);
if (origen.smtp_host && !SMTP_PASS) {
  console.warn("AVISO: el origen usa SMTP propio y no llegó SMTP_PASS: los correos de Auth (recuperar contraseña) no saldrán hasta ponerla.");
}
