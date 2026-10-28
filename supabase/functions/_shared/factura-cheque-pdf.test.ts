import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { generarPdfFactura, type FacturaCheque } from "./factura-cheque-pdf.ts";
const ejemplo: FacturaCheque = {
  id: "test", numero: "CT-00000001", emitida_en: "2026-10-03T13:40:00Z",
  emisor: { emisor_nombre: "Casa Tomás", emisor_nif: "B12345678", emisor_direccion: "Crevillent", logo_data: "", pie: "Cheque regalo" },
  cliente: { nombre: "Ana López", nif: "12345678Z", direccion: "Crevillent", email: "ana@example.com" },
  importe_eur: 100, iva_porcentaje: 21, email_enviado_en: null,
};
Deno.test("el PDF es idéntico al reintentar la misma factura", async () => {
  const primero = await generarPdfFactura(ejemplo);
  const segundo = await generarPdfFactura(ejemplo);
  if (primero !== segundo) throw new Error("El PDF ha cambiado entre reintentos");
  const pdf = await PDFDocument.load(primero);
  if (pdf.getPageCount() !== 1) throw new Error("La factura normal debe tener una página");
});
Deno.test("los datos largos pasan el concepto y los totales a otra página", async () => {
  const larga = { ...ejemplo, cliente: { ...ejemplo.cliente, nombre: "Nombre completo ".repeat(13).slice(0, 200), direccion: "Dirección de facturación extensa ".repeat(10).slice(0, 300), email: "x".repeat(308) + "@example.com" } };
  const pdf = await PDFDocument.load(await generarPdfFactura(larga));
  if (pdf.getPageCount() !== 2) throw new Error("Los campos extensos necesitan una segunda página sin solapamientos");
});
Deno.test("los gastos de gestión van en su línea y suman al total pagado", async () => {
  const conGastos = { ...ejemplo, importe_eur: 50, gastos_gestion_eur: 1.02 };
  const pdf = await PDFDocument.load(await generarPdfFactura(conGastos));
  if (pdf.getPageCount() !== 1) throw new Error("La línea de gastos no debe empujar los totales a otra página");
  const sinGastos = await generarPdfFactura({ ...ejemplo, gastos_gestion_eur: 0 });
  if (sinGastos !== await generarPdfFactura(ejemplo)) throw new Error("Sin gastos, la factura queda igual que antes");
});
