import { generarPaginasRegalo } from "../../../../src/lib/cheques/render-vista-regalo.ts";
import { generarVistaRegalo } from "./pdf-plantilla.ts";
import { CHEQUE_EJEMPLO, PLANTILLA_REGALO } from "./plantilla.ts";
import { LOGO_CASA_TOMAS_PNG_BASE64 } from "./logo-base64.ts";

Deno.test("el navegador y el PDF coinciden en opciones, tokens, caracteres y saltos de página", async () => {
  for (const ocultar_importe of [false, true]) for (const dedicatoria of [false, true]) for (const largo of [false, true]) {
    const cheque = { ...CHEQUE_EJEMPLO, ocultar_importe,
      mensaje: dedicatoria ? "¡Felicidades María! AV € — < & {importe} ❤️".repeat(largo ? 80 : 1) : null };
    const plantilla = { ...PLANTILLA_REGALO, pdf_subtitulo: "Para {destinatario} · {importe}",
      pdf_pie: largo ? "Instrucciones de regalo. ".repeat(200) : PLANTILLA_REGALO.pdf_pie };
    const pdf = await generarVistaRegalo(cheque, plantilla, "data:image/png;base64," + LOGO_CASA_TOMAS_PNG_BASE64);
    const local = await generarPaginasRegalo(cheque, plantilla);
    if (JSON.stringify(pdf.paginas) !== JSON.stringify(local)) throw new Error("La vista local no coincide con el trazado del PDF");
    if (largo && local.length < 2) throw new Error("El texto largo debe paginar");
  }
});
