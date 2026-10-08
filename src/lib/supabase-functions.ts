/**
 * Endpoints de las Edge Functions públicas de Supabase.
 *
 * Sustituyen a los webhooks de n8n (`n8npersonal.miguelbenito.space`), que
 * desaparecen con la migración. La base NUNCA se escribe a mano: sale de
 * `VITE_SUPABASE_URL`, la misma variable que ya usan el cliente de Supabase y
 * las páginas de carta.
 *
 * Si la variable no estuviera definida (tests, previsualización) las URLs
 * quedan RELATIVAS (`/functions/v1/...`) en lugar de apuntar a un host
 * equivocado. En producción `integrations/supabase/client.ts` ya revienta en el
 * arranque si falta, así que ese caso no llega al visitante.
 *
 * Gotcha SSG: a nivel de módulo aquí solo se lee `import.meta.env`. Nada de
 * `window`, `localStorage` ni `navigator`, que no existen durante el prerender
 * (`estaEnLinea()` sí mira `navigator`, pero dentro de la función y con un
 * `typeof` delante, así que nunca se ejecuta en el build).
 */

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "").replace(/\/+$/, "");

const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "";

export const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

/** `POST` → array plano de disponibilidad (ver `reservas-web.ts`). */
export const RESERVAS_WEB_DISPONIBILIDAD_URL = `${FUNCTIONS_BASE_URL}/reservas-web/disponibilidad`;
/** `POST` → 201 en éxito; 400/403/409/422 con `motivo` + `mensaje` en rechazo. */
export const RESERVAS_WEB_CREAR_URL = `${FUNCTIONS_BASE_URL}/reservas-web/crear`;
/** `POST` JSON `{ mensaje, idiom, id }` → `{ success, respuesta, codigo? }`. */
export const CHAT_WEB_URL = `${FUNCTIONS_BASE_URL}/chat-web`;
/**
 * `POST` → `{ url }` (sesión de Stripe Checkout) en éxito; 422/502/503 con
 * `motivo` + `mensaje` en rechazo. El webhook que confirma el pago
 * (`stripe-webhook-cheques-regalo`) lo llama Stripe directamente, nunca el
 * navegador, así que no tiene URL aquí.
 */
export const CHEQUES_REGALO_PLANTILLA_VISTA_URL = `${FUNCTIONS_BASE_URL}/cheques-regalo-web/plantilla-vista`;
export const CHEQUES_REGALO_VISTA_URL = `${FUNCTIONS_BASE_URL}/cheques-regalo-web/vista-previa`;
export const CHEQUES_REGALO_CREAR_URL = `${FUNCTIONS_BASE_URL}/cheques-regalo-web/crear`;

/**
 * Cabeceras de una llamada POST JSON a una Edge Function.
 *
 * Ni `reservas-web` ni `chat-web` tienen entrada en `supabase/config.toml`, de
 * modo que `verify_jwt` vale `true` por defecto y la pasarela exige la clave
 * publicable. Va en `apikey` + `Authorization`, que es lo que manda
 * `supabase.functions.invoke()` y lo que ambas funciones listan en su
 * `Access-Control-Allow-Headers`.
 *
 * NO se envía `x-webhook-secret`: era el secreto de n8n
 * (`VITE_N8N_WEBHOOK_SECRET`), viajaba vacío en el bundle y `chat-web` ni
 * siquiera lo permite en el preflight CORS, así que la petición moría en el
 * `OPTIONS` sin llegar nunca a la función.
 */
export function functionHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (SUPABASE_KEY) {
    headers.apikey = SUPABASE_KEY;
    headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  }
  return headers;
}

/**
 * Lee el cuerpo de una respuesta PASE LO QUE PASE con el código HTTP.
 *
 * El fallo que arregla: `if (!response.ok) throw` se comía el cuerpo de todos
 * los rechazos, que es justo donde viajan el `mensaje` legible para el
 * visitante y el `codigo` de los 429/503 del chatbot.
 *
 * Devuelve el JSON parseado, el texto crudo si no era JSON, o `null` si el
 * cuerpo venía vacío o ilegible. Nunca lanza.
 */
export async function leerCuerpo(response: Response): Promise<unknown> {
  let texto: string;
  try {
    texto = await response.text();
  } catch {
    return null;
  }
  if (!texto.trim()) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

/**
 * Los dos fallos que el visitante tiene que poder distinguir.
 *
 *  - `sin_red`:  el dispositivo no tiene conexión. Ahí sí vale pedirle que la
 *                compruebe.
 *  - `servidor`: lo que ha fallado es lo NUESTRO (5xx, CORS, la función caída,
 *                un cuerpo ilegible). Nunca se le echa la culpa al visitante:
 *                se le dice que el fallo es nuestro y se le da el teléfono.
 */
export type TipoFallo = "sin_red" | "servidor";

/**
 * `navigator.onLine`, leído sin romper el prerender del SSG (allí no existe
 * `navigator`) y sin fiarse de él más de lo que aguanta:
 *
 *  - `false` es FIABLE: el navegador solo lo pone cuando el sistema dice que no
 *    hay ninguna ruta de red.
 *  - `true` NO garantiza internet (wifi de hotel sin salida, portal cautivo,
 *    DNS roto), así que por sí solo no sirve para culpar a nadie.
 *
 * Ante la duda devuelve `true`, de modo que el fallo se clasifica como NUESTRO.
 * El error caro es el contrario: decirle "comprueba tu conexión" a quien la
 * tiene perfecta mientras el servidor está caído — ese cliente se va a otro
 * restaurante. Al revés no se pierde nada: a quien de verdad no tenga red,
 * decirle que el fallo es nuestro y darle el teléfono no le quita ninguna
 * salida (la voz del móvil funciona sin datos).
 */
export function estaEnLinea(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return true;
  return navigator.onLine;
}

/**
 * Decide qué cara del fallo se le cuenta al visitante.
 *
 * `status`:
 *   - `> 0` → HUBO respuesta HTTP. Entonces la red del visitante funciona por
 *     definición (han llegado bytes desde nuestro host), así que el fallo es
 *     NUESTRO sin discusión. Fiabilidad: total.
 *   - `0` → `fetch` lanzó sin llegar a producir respuesta: red caída, DNS, TLS
 *     o CORS (que es lo que enseña el navegador cuando la Edge Function muere
 *     al arrancar y ni contesta al `OPTIONS`). Único caso ambiguo; se desempata
 *     con `navigator.onLine`.
 */
export function clasificarFallo(status: number, enLinea: boolean = estaEnLinea()): TipoFallo {
  if (status > 0) return "servidor";
  return enLinea ? "servidor" : "sin_red";
}
