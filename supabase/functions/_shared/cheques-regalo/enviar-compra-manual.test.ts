import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enviarCompraManual } from "./enviar-compra-manual.ts";
import { CHEQUE_EJEMPLO } from "./plantilla.ts";
const assert = (v: unknown, message = "Resultado incorrecto") => { if (!v) throw new Error(message); };

Deno.test("sin factura envía el regalo y no emite facturas", async () => {
  let regalos = 0, facturas = 0, marcas = 0;
  const db = { from: () => ({ update: () => ({ eq: () => { marcas++; return Promise.resolve({ error: null }); } }) }) } as unknown as SupabaseClient;
  const resultado = await enviarCompraManual(db, { ...CHEQUE_EJEMPLO, ocultar_importe: true }, {
    prepararChequeEmail: (_db, c) => Promise.resolve(c),
    enviarEmailCheque: (_c, opciones) => { assert(opciones.ocultarImporte); regalos++; return Promise.resolve(true); },
    enviarFacturaCheque: () => { facturas++; return Promise.resolve(); },
  });
  assert(resultado.email_enviado && !resultado.factura_solicitada && !resultado.factura_enviada);
  assert(regalos === 1 && marcas === 1 && facturas === 0);
});

Deno.test("factura pendiente se reintenta aunque el cheque ya haya sido enviado", async () => {
  let regalos = 0, facturas = 0;
  const solicitudes: string[] = [];
  const compra = { ...CHEQUE_EJEMPLO, solicita_factura: true, email_enviado_en: "2026-10-08T05:30:00Z" };
  const servicios = {
    prepararChequeEmail: (_db: SupabaseClient, c: typeof CHEQUE_EJEMPLO) => Promise.resolve(c),
    enviarEmailCheque: () => { regalos++; return Promise.resolve(true); },
    enviarFacturaCheque: (_db: SupabaseClient, id: string) => { solicitudes.push(id); facturas++; return facturas === 1 ? Promise.reject(new Error("Prueba: envío interrumpido")) : Promise.resolve(); },
  };
  const db = {} as SupabaseClient;
  const primero = await enviarCompraManual(db, compra, servicios);
  assert(primero.email_enviado && !primero.factura_enviada && primero.factura_solicitada);
  const segundo = await enviarCompraManual(db, compra, servicios);
  assert(segundo.email_enviado && segundo.factura_enviada);
  assert(regalos === 0 && facturas === 2 && solicitudes.every(id => id === compra.id));
});

Deno.test("un fallo del regalo no impide enviar la factura de la compra cobrada", async () => {
  let facturas = 0;
  const resultado = await enviarCompraManual({} as SupabaseClient, { ...CHEQUE_EJEMPLO, solicita_factura: true }, {
    prepararChequeEmail: (_db, c) => Promise.resolve(c),
    enviarEmailCheque: () => Promise.resolve(false),
    enviarFacturaCheque: () => { facturas++; return Promise.resolve(); },
  });
  assert(!resultado.email_enviado && resultado.factura_enviada && facturas === 1);
});
