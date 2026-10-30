/**
 * Origen del sitio para `success_url` / `cancel_url` de Stripe Checkout
 * (CT-REM-FN-08). La cabecera `Origin` la controla quien llama: solo se usa si
 * está en la lista de orígenes permitidos; si no, se usa el dominio oficial.
 */

function normalizarOrigen(valor: string): string | null {
  try {
    const u = new URL(valor.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * `permitidos` es el valor de CHEQUES_REGALO_ALLOWED_ORIGIN: uno o varios
 * orígenes separados por comas. `*` o valores no válidos se ignoran (un
 * comodín no es un destino de redirección válido). `fallback` es el sitio
 * oficial (CHEQUES_REGALO_SITE_URL) y siempre está permitido.
 */
export function resolverUrlSitio(origenPeticion: string | null, permitidos: string | undefined, fallback: string): string {
  const base = fallback.replace(/\/+$/, "");
  const lista = new Set<string>();
  const oficial = normalizarOrigen(base);
  if (oficial) lista.add(oficial);
  for (const p of (permitidos ?? "").split(",")) {
    const o = normalizarOrigen(p);
    if (o) lista.add(o);
  }
  const pedido = origenPeticion ? normalizarOrigen(origenPeticion) : null;
  return pedido && lista.has(pedido) ? pedido : base;
}

/**
 * Valor de `Access-Control-Allow-Origin`. Si la variable vale `*` (o no está
 * definida) se mantiene `*` como hasta ahora. Si es una lista, devuelve el
 * Origin de la petición solo si está permitido; si no, el origen oficial.
 * Nunca devuelve la lista entera. Con lista, la respuesta debe llevar
 * `Vary: Origin`.
 */
export function resolverOrigenCors(origenPeticion: string | null, permitidos: string | undefined, fallback: string): string {
  const crudo = (permitidos ?? "").trim();
  if (crudo === "" || crudo === "*") return "*";
  return resolverUrlSitio(origenPeticion, crudo, fallback);
}
