import { useEffect, useLayoutEffect, useRef, useState, useMemo, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flushSync } from "react-dom";
import { useCerrarConAtras } from "@/hooks/useCerrarConAtras";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { crearSesionVistaRegalo, type SesionVistaRegalo } from "@/lib/cheques/vista-regalo";
import { calcularGastosGestion, GASTOS_GESTION_APAGADOS } from "../../supabase/functions/_shared/cheques-regalo/gastos-gestion";
import { VistaRegaloCompra } from "./VistaRegaloCompra";
import { Label } from "@/components/ui/label";
import { Check, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { DatosComprador } from "./ContactoSection";

const copyByLanguage = {
  es: { showAmount: "Mostrar el importe en el regalo y en el PDF", dedication: "Incluir dedicatoria en el PDF", preview: "Vista previa del cheque PDF", loading: "Generando vista previa…", previewError: "La vista previa no está disponible ahora. Puedes continuar con la compra.", sample: "Código de ejemplo. El definitivo se genera al confirmar el pago.", next: "Continuar", back: "Atrás", step: "Paso", of: "de", optional: "Opcional · puedes continuar sin rellenarlo", invoice: "¿Necesitas factura?", no: "No necesito factura", review: "Revisa la información de compra", required: "Completa este dato para continuar.", locale: "es-ES", voucher: "Cheque regalo", fees: "Gastos de gestión", total: "Total a pagar", feesNote: "Gastos de gestión de la compra online, iguales para cualquier forma de pago." },
  en: { showAmount: "Show the amount on the gift and PDF", dedication: "Include a dedication in the PDF", preview: "Gift PDF preview", loading: "Generating preview…", previewError: "The preview is unavailable right now. You can continue with your purchase.", sample: "Sample code. The final code is generated after payment.", next: "Continue", back: "Back", step: "Step", of: "of", optional: "Optional · you can leave this blank", invoice: "Do you need an invoice?", no: "No invoice needed", review: "Review your purchase details", required: "Complete this field to continue.", locale: "en-GB", voucher: "Gift voucher", fees: "Handling fee", total: "Total to pay", feesNote: "Online purchase handling fee, the same for every payment method." },
  fr: { showAmount: "Afficher le montant sur le cadeau et le PDF", dedication: "Inclure une dédicace dans le PDF", preview: "Aperçu du chèque PDF", loading: "Génération de l’aperçu…", previewError: "L’aperçu est indisponible. Vous pouvez continuer votre achat.", sample: "Code d’exemple. Le code définitif est généré après le paiement.", next: "Continuer", back: "Retour", step: "Étape", of: "sur", optional: "Facultatif · vous pouvez laisser ce champ vide", invoice: "Souhaitez-vous une facture ?", no: "Pas de facture", review: "Vérifiez les informations d’achat", required: "Renseignez ce champ pour continuer.", locale: "fr-FR", voucher: "Chèque cadeau", fees: "Frais de gestion", total: "Total à payer", feesNote: "Frais de gestion de l’achat en ligne, identiques quel que soit le moyen de paiement." },
};
type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; importe: string; datos: DatosComprador;
  setDatos: Dispatch<SetStateAction<DatosComprador>>; enviando: boolean; error: string | null;
  setError: (error: string | null) => void; confirmar: () => Promise<void>;
};
type Field = { key: keyof DatosComprador | "factura" | "resumen" | "vista"; label: string; type: string; required?: boolean; max?: number; complete?: string; placeholder?: string };
export function CompraChequePasos({ open, onOpenChange, importe, datos, setDatos, enviando, error, setError, confirmar }: Props) {
  const { t, language } = useTranslations();
  const c = t.contacto, copy = copyByLanguage[language || "es"];
  // Al cerrar, `sesionVista` pasa a null mientras el diálogo aún se está desmontando: la vista
  // previa recibiría `undefined`, abriría una sesión propia y repetiría la petición a
  // `plantilla-vista`. `ultimaSesion` le sigue dando la misma (con su caché) hasta desmontarse.
  useCerrarConAtras(open, () => onOpenChange(false), "capaCheque"); // «atrás» del móvil cierra el diálogo, no la página
  const ultimaSesion = useRef<SesionVistaRegalo | null>(null);
  const sesionVista = useMemo(() => (open ? (ultimaSesion.current = crearSesionVistaRegalo()) : null), [open]);
  useEffect(() => { if (sesionVista) void sesionVista.preparar().catch(() => {}); }, [sesionVista]);
  // Los gastos que cobrará la función de pago; hasta que se sepan, ninguno.
  const [configGastos, setConfigGastos] = useState(GASTOS_GESTION_APAGADOS);
  useEffect(() => {
    let activo = true;
    setConfigGastos(GASTOS_GESTION_APAGADOS);
    if (sesionVista) void sesionVista.gastos().then(config => { if (activo) setConfigGastos(config); });
    return () => { activo = false; };
  }, [sesionVista]);
  const importeCheque = Math.round(Number(importe) * 100) / 100;
  const gastos = calcularGastosGestion(importeCheque, configGastos);
  const eur = (n: number) => n.toLocaleString(copy.locale, { style: "currency", currency: "EUR" });
  const [step, setStep] = useState(0);
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setStep(0);
    const vv = window.visualViewport;
    const adjust = () => setViewport({ height: vv?.height ?? window.innerHeight, top: vv?.offsetTop ?? 0 });
    adjust();
    vv?.addEventListener("resize", adjust); vv?.addEventListener("scroll", adjust);
    window.addEventListener("resize", adjust);
    return () => { vv?.removeEventListener("resize", adjust); vv?.removeEventListener("scroll", adjust); window.removeEventListener("resize", adjust); };
  }, [open]);
  useEffect(() => { body.current?.scrollTo?.({ top: 0 }); }, [step]);
  const fields: Field[] = [
    { key: "nombre", label: c.giftFormBuyerName, type: "text", required: true, max: 200, complete: "name", placeholder: c.giftFormBuyerNamePlaceholder },
    { key: "email", label: c.giftFormBuyerEmail, type: "email", required: true, max: 320, complete: "email", placeholder: c.giftFormBuyerEmailPlaceholder },
    { key: "telefono", label: c.giftFormBuyerPhone, type: "tel", max: 40, complete: "tel", placeholder: c.giftFormBuyerPhonePlaceholder },
    { key: "destinatario", label: c.giftFormRecipientName, type: "text", max: 200, placeholder: c.giftFormRecipientNamePlaceholder },
    { key: "mensaje", label: c.giftFormMessage, type: "textarea", max: 500, placeholder: c.giftFormMessagePlaceholder },
    { key: "fechaEntrega", label: c.giftFormDeliveryDate, type: "date" },
    { key: "factura", label: copy.invoice, type: "choice" },
    ...(datos.solicitaFactura ? [
      { key: "facturaNombre", label: c.giftInvoiceName, type: "text", required: true, max: 200, complete: "organization" },
      { key: "facturaNif", label: c.giftInvoiceTaxId, type: "text", required: true, max: 30 },
      { key: "facturaDireccion", label: c.giftInvoiceAddress, type: "textarea", required: true, max: 300, complete: "street-address" },
    ] as Field[] : []),
    { key: "resumen", label: copy.review, type: "summary" },
    { key: "vista", label: copy.preview, type: "preview" },
  ];
  const field = fields[Math.min(step, fields.length - 1)];
  const final = field.type === "preview";
  useLayoutEffect(() => {
    if (open && step > 0) body.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([hidden]):not([type="checkbox"]), textarea:not([hidden])')?.focus({ preventScroll: true });
  }, [open, step]);
  const value = field.key in datos ? String(datos[field.key as keyof DatosComprador]) : "";
  function next() {
    if (field.required && !value.trim()) { setError(field.key === "nombre" ? c.toasts.giftMissingName : field.key.startsWith("factura") ? c.giftInvoiceMissingData : copy.required); return; }
    if (field.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) { setError(c.toasts.giftInvalidEmail); return; }
    setError(null);
    if (final) void confirmar(); else goTo(step + 1);
  }
  function goTo(nextStep: number) {
    // iOS requires focus during the tap itself, rather than a later effect.
    flushSync(() => setStep(nextStep));
    body.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([hidden]):not([type="checkbox"]), textarea:not([hidden])')?.focus({ preventScroll: true });
  }
  const opciones = <div className="space-y-3 rounded-xl border p-3 text-sm">
    <label className="flex min-h-11 cursor-pointer items-center gap-3"><Checkbox disabled={enviando} checked={!datos.ocultarImporte} onCheckedChange={v => setDatos(d => ({ ...d, ocultarImporte: v !== true }))} />{copy.showAmount}</label>
    <label className="flex min-h-11 cursor-pointer items-center gap-3"><Checkbox disabled={enviando} checked={datos.incluirDedicatoria} onCheckedChange={v => setDatos(d => ({ ...d, incluirDedicatoria: v === true }))} />{copy.dedication}</label>
  </div>;
  function change(value: string) { setDatos(d => ({ ...d, [field.key]: value })); setError(null); }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent onOpenAutoFocus={e => e.preventDefault()}
      // Alto: 35 rem (= 560 px con la letra normal) o el espacio visible si es menor. En rem y no en px:
      // con el texto del sistema al 200 % el diálogo crece con la letra, hasta ocupar toda la pantalla,
      // y el botón «Continuar» no se recorta.
      style={viewport ? { top: viewport.top + viewport.height / 2, maxHeight: viewport.height - 24, "--alto-visible": `${viewport.height - 24}px` } as CSSProperties : undefined}
      className="h-[min(35rem,var(--alto-visible))] flex w-[calc(100%_-_1.5rem)] max-w-[calc(100%_-_1.5rem)] sm:max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 max-h-[calc(100dvh-1.5rem)]">
      <DialogHeader className="shrink-0 border-b p-4 text-left bg-accent/5">
        <DialogTitle className="pr-10 text-base">{c.giftDialogTitle}</DialogTitle>
        <DialogDescription className="sr-only">{c.giftDialogDescription}</DialogDescription>
        <div className="flex justify-between text-xs text-muted-foreground pr-10"><span>{copy.step} {step + 1} {copy.of} {fields.length}</span><span className="font-semibold text-accent">{gastos > 0 ? eur(importeCheque + gastos) : importe + " €"}</span></div>
        <div className="h-1 rounded-full bg-accent/10 overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: ((step + 1) / fields.length * 100) + "%" }} /></div>
      </DialogHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={e => { e.preventDefault(); next(); }} noValidate>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col min-w-0" aria-live="polite">
          <div className="space-y-3 w-full min-w-0 my-auto">
            {!final && <h2 className="text-xl sm:text-2xl font-semibold text-center">{field.label}</h2>}
            {field.type === "choice" ? <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">{c.giftInvoiceDescription}</p>
              <Button type="button" aria-pressed={datos.solicitaFactura} disabled={enviando} variant="outline" className={`w-full h-auto min-h-14 p-4 whitespace-normal text-left justify-start gap-3 ${datos.solicitaFactura ? "border-accent bg-accent/10" : ""}`}
                onClick={() => { setDatos(d => ({ ...d, solicitaFactura: true, facturaNombre: d.facturaNombre || d.nombre })); setError(null); }}>
                <FileText className="h-5 w-5 shrink-0" />{c.giftInvoiceRequest}{datos.solicitaFactura && <Check className="h-5 w-5 shrink-0 ml-auto" />}
              </Button>
              <Button type="button" aria-pressed={!datos.solicitaFactura} disabled={enviando} variant="outline" className={`w-full min-h-14 ${!datos.solicitaFactura ? "border-accent bg-accent/10" : ""}`} onClick={() => { setDatos(d => ({ ...d, solicitaFactura: false })); setError(null); }}>{copy.no}</Button>
            </div> : field.type === "summary" ? <div className="space-y-4"><dl className="rounded-xl bg-muted/50 p-4 text-sm space-y-3">
              {fields.filter(f => (f.key !== "mensaje" || datos.incluirDedicatoria) && f.key in datos && String(datos[f.key as keyof DatosComprador] || "").trim()).map(f => <div key={f.key}><dt className="text-muted-foreground">{f.label}</dt><dd className="font-medium break-words whitespace-pre-wrap">{String(datos[f.key as keyof DatosComprador])}</dd></div>)}
              <div><dt className="text-muted-foreground">{copy.invoice}</dt><dd>{datos.solicitaFactura ? c.giftInvoiceRequest : copy.no}</dd></div>
            </dl>{gastos > 0 && <div className="rounded-xl border p-4 text-sm space-y-2">
              <p className="flex justify-between gap-3"><span>{copy.voucher}</span><span>{eur(importeCheque)}</span></p>
              <p className="flex justify-between gap-3"><span>{copy.fees}</span><span>{eur(gastos)}</span></p>
              <p className="flex justify-between gap-3 border-t pt-2 font-semibold"><span>{copy.total}</span><span>{eur(importeCheque + gastos)}</span></p>
              <p className="text-xs text-muted-foreground">{copy.feesNote}</p>
            </div>}</div> : final ? <div className="space-y-4">{opciones}<VistaRegaloCompra sesion={sesionVista || ultimaSesion.current || undefined} importe={importe} nombre={datos.nombre} destinatario={datos.destinatario} mensaje={datos.mensaje} ocultarImporte={datos.ocultarImporte} incluirDedicatoria={datos.incluirDedicatoria} texto={copy} /></div> : <div className="space-y-3">
              {field.key === "mensaje" && opciones}
              <Label htmlFor={"gift-step-" + field.key} className="sr-only">{field.label}</Label>
              <Textarea style={field.type === "date" || (field.key === "mensaje" && !datos.incluirDedicatoria) ? { display: "none" } : undefined} hidden={field.type === "date" || (field.key === "mensaje" && !datos.incluirDedicatoria)} id={field.type === "date" ? undefined : "gift-step-" + field.key}
                className={`block w-full min-w-0 max-w-full resize-none text-[16px] leading-6 rounded-xl ${field.type === "textarea" ? "min-h-20 max-h-32" : "min-h-14 h-14"}`}
                rows={field.type === "textarea" ? 3 : 1} value={value} maxLength={field.max}
                inputMode={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                enterKeyHint={field.type === "textarea" ? "enter" : "next"} autoComplete={field.complete}
                placeholder={field.placeholder} disabled={enviando}
                onKeyDown={e => { if (e.key === "Enter" && field.type !== "textarea") { e.preventDefault(); next(); } }}
                onChange={e => change(field.type === "textarea" ? e.target.value : e.target.value.replace(/[\r\n]/g, ""))} />
              <Input style={field.type !== "date" ? { display: "none" } : undefined} hidden={field.type !== "date"} id={field.type === "date" ? "gift-step-" + field.key : undefined}
                className="h-14 w-full min-w-0 max-w-full text-[16px] rounded-xl appearance-none" type="date"
                value={field.type === "date" ? value : ""} disabled={enviando} onChange={e => change(e.target.value)} />
              {!field.required && <p className="text-xs text-center text-muted-foreground">{copy.optional}</p>}
            </div>}

          </div>
        </div>
        {error && <p role="alert" className="shrink-0 max-h-24 overflow-y-auto border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
        {/* `flex-wrap`: con la letra al 200 % «Cancelar» + «Continuar» no caben en una fila y el pie se recortaba; así «Continuar» baja a su propia fila. */}
        <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-t bg-background p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" onPointerDown={e => e.preventDefault()} variant="outline" className="h-12 min-w-0" disabled={enviando} onClick={() => { setError(null); if (step) goTo(step - 1); else onOpenChange(false); }}>{step ? copy.back : c.giftFormCancel}</Button>
          <Button type="submit" onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} className="h-12 min-w-0 flex-1 basis-32 bg-accent hover:bg-accent-hover whitespace-normal" disabled={enviando}>{enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{final ? enviando ? c.giftFormSubmitting : c.giftFormSubmit : copy.next}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
