/**
 * Lo que explica Resend cuando rechaza un envío (p. ej. `validation_error:
 * The gmail.com domain is not verified…`), listo para el log y para el panel.
 *
 * Antes solo se registraba el código HTTP y no había forma de saber por qué no
 * salía un correo. Se recorta y se tapan las direcciones de email que pueda
 * traer el mensaje (la del comprador, la de la cuenta de Resend): nunca lleva
 * la clave, que solo va en la cabecera de la petición.
 */
export function resumirErrorResend(cuerpo: string, maximo = 300): string {
  let texto = cuerpo;
  try {
    const json = JSON.parse(cuerpo) as { name?: unknown; message?: unknown } | null;
    if (json && typeof json === "object") {
      const partes = [json.name, json.message].filter((p): p is string => typeof p === "string" && p.trim() !== "");
      if (partes.length) texto = partes.join(": ");
    }
  } catch {
    // No es JSON: se usa el texto tal cual.
  }
  texto = texto.replace(/[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+/g, "[email]").replace(/\s+/g, " ").trim();
  return texto.length > maximo ? texto.slice(0, maximo) + "…" : texto;
}

/** Lee el cuerpo de una respuesta fallida de Resend y lo resume (`resumirErrorResend`). */
export async function detalleErrorResend(response: Response): Promise<string> {
  const cuerpo = await response.text().catch(() => "");
  return resumirErrorResend(cuerpo) || "sin detalle";
}
