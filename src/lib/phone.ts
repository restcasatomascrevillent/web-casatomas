/**
 * Separa un teléfono internacional en prefijo de país + número nacional.
 *
 * El bug que arregla: la expresión anterior era
 *     `telefono.replace(/\s+/g, "").match(/^\+(\d{1,3})(\d{6,14})$/)`
 * y `\d{1,3}` es CODICIOSO. Para "+34 612345678" se quitaba el espacio,
 * quedaba "+34612345678", el prefijo se comía un dígito de más ("346") y el
 * webhook recibía `"+346 12345678"`. Verificado en el payload real.
 *
 * Hacer el cuantificador perezoso tampoco sirve: "+3 4612345678" también encaja.
 * El prefijo de un teléfono E.164 no se puede deducir contando dígitos, hay que
 * conocerlo. Por eso:
 *   1. Si el visitante ya separó el prefijo con espacio o guion, se respeta.
 *      (El campo viene precargado con "+34 " y el placeholder es "+34 612345678",
 *      así que es el caso normal.)
 *   2. Si no, se prueba contra una tabla de prefijos, de más largo a más corto.
 *   3. Si nada encaja, se devuelve lo que escribió el usuario sin tocarlo.
 *      Mejor un dato crudo que uno corrompido en silencio.
 */

/**
 * Prefijos de llamada ordenados de más largo a más corto.
 * España primero y el resto: mercados turísticos de la costa alicantina.
 */
const PREFIJOS = [
  // 4 dígitos
  "1809", "1829", "1849",
  // 3 dígitos
  "212", "213", "216", "218", "220", "351", "352", "353", "354", "355", "356",
  "357", "358", "359", "370", "371", "372", "373", "374", "375", "376", "377",
  "378", "379", "380", "381", "382", "383", "385", "386", "387", "389", "420",
  "421", "423",
  // 2 dígitos
  "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44",
  "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56", "57", "58",
  "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91",
  "92", "93", "94", "95", "98",
  // 1 dígito
  "1", "7",
].sort((a, b) => b.length - a.length);

const MIN_NACIONAL = 6;
const MAX_NACIONAL = 14;

export interface TelefonoPartido {
  /** Prefijo con el `+` incluido, p. ej. "+34". */
  prefijo: string;
  /** Número nacional, solo dígitos. */
  numero: string;
}

export function partirTelefono(valor: string): TelefonoPartido | null {
  const bruto = (valor ?? "").trim();
  if (!bruto) return null;

  // 1. El visitante ya separó el prefijo.
  const conSeparador = bruto.match(/^\+(\d{1,4})[\s-]+([\d\s-]+)$/);
  if (conSeparador) {
    const numero = conSeparador[2].replace(/[\s-]/g, "");
    if (numero.length >= MIN_NACIONAL && numero.length <= MAX_NACIONAL) {
      return { prefijo: `+${conSeparador[1]}`, numero };
    }
  }

  // 2. Todo junto: se busca el prefijo en la tabla.
  const soloDigitos = bruto.replace(/[\s-]/g, "");
  const completo = soloDigitos.match(/^\+(\d{7,18})$/);
  if (completo) {
    const digitos = completo[1];
    for (const prefijo of PREFIJOS) {
      if (!digitos.startsWith(prefijo)) continue;
      const numero = digitos.slice(prefijo.length);
      if (numero.length >= MIN_NACIONAL && numero.length <= MAX_NACIONAL) {
        return { prefijo: `+${prefijo}`, numero };
      }
    }
  }

  return null;
}

/** Formato que espera el webhook de reservas: `"+34 612345678"`. */
export function formatearTelefonoWebhook(valor: string): string {
  const partido = partirTelefono(valor);
  return partido ? `${partido.prefijo} ${partido.numero}` : (valor ?? "").trim();
}
