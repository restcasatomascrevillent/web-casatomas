import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "@/i18n/LanguageProvider";
import type { DatosComprador } from "./ContactoSection";

const copyByLanguage = {
  es: { next: "Continuar", back: "Atrás", step: "Paso", of: "de", optional: "Opcional · puedes continuar sin rellenarlo", invoice: "¿Necesitas factura?", no: "No necesito factura", review: "Revisa tu regalo", required: "Completa este dato para continuar." },
  en: { next: "Continue", back: "Back", step: "Step", of: "of", optional: "Optional · you can leave this blank", invoice: "Do you need an invoice?", no: "No invoice needed", review: "Review your gift", required: "Complete this field to continue." },
  fr: { next: "Continuer", back: "Retour", step: "Étape", of: "sur", optional: "Facultatif · vous pouvez laisser ce champ vide", invoice: "Souhaitez-vous une facture ?", no: "Pas de facture", review: "Vérifiez votre cadeau", required: "Renseignez ce champ pour continuer." },
};
type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; importe: string; datos: DatosComprador;
  setDatos: Dispatch<SetStateAction<DatosComprador>>; enviando: boolean; error: string | null;
  setError: (error: string | null) => void; confirmar: () => Promise<void>;
};
type Field = { key: keyof DatosComprador | "factura" | "resumen"; label: string; type: string; required?: boolean; max?: number; complete?: string; placeholder?: string };
export function CompraChequePasos({ open, onOpenChange, importe, datos, setDatos, enviando, error, setError, confirmar }: Props) {
  const { t, language } = useTranslations();
  const c = t.contacto, copy = copyByLanguage[language || "es"];
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
  ];
  const field = fields[Math.min(step, fields.length - 1)];
  const final = field.type === "summary";
  useLayoutEffect(() => {
    if (open && step > 0) body.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")?.focus({ preventScroll: true });
  }, [open, step]);
  const value = field.key in datos ? String(datos[field.key as keyof DatosComprador]) : "";
  function next() {
    if (field.required && !value.trim()) { setError(field.key === "nombre" ? c.toasts.giftMissingName : field.key.startsWith("factura") ? c.giftInvoiceMissingData : copy.required); return; }
    if (field.key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) { setError(c.toasts.giftInvalidEmail); return; }
    setError(null);
    if (final) void confirmar(); else setStep(s => s + 1);
  }
  function change(value: string) { setDatos(d => ({ ...d, [field.key]: value })); setError(null); }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent onOpenAutoFocus={e => e.preventDefault()}
      style={viewport ? { top: viewport.top + viewport.height / 2, height: Math.min(560, viewport.height - 24), maxHeight: viewport.height - 24 } : undefined}
      className="flex w-[calc(100%-1.5rem)] sm:max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 max-h-[calc(100dvh-1.5rem)]">
      <DialogHeader className="shrink-0 border-b p-4 text-left bg-accent/5">
        <DialogTitle className="pr-10 text-base">{c.giftDialogTitle}</DialogTitle>
        <DialogDescription className="sr-only">{c.giftDialogDescription}</DialogDescription>
        <div className="flex justify-between text-xs text-muted-foreground pr-10"><span>{copy.step} {step + 1} {copy.of} {fields.length}</span><span className="font-semibold text-accent">{importe} €</span></div>
        <div className="h-1 rounded-full bg-accent/10 overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: ((step + 1) / fields.length * 100) + "%" }} /></div>
      </DialogHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={e => { e.preventDefault(); next(); }} noValidate>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col" aria-live="polite">
          <div className="space-y-4 w-full my-auto">
            <h2 className="text-xl sm:text-2xl font-semibold text-center">{field.label}</h2>
            {field.type === "choice" ? <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">{c.giftInvoiceDescription}</p>
              <Button type="button" aria-pressed={datos.solicitaFactura} disabled={enviando} variant="outline" className={`w-full h-auto min-h-14 p-4 whitespace-normal text-left justify-start gap-3 ${datos.solicitaFactura ? "border-accent bg-accent/10" : ""}`}
                onClick={() => { setDatos(d => ({ ...d, solicitaFactura: true, facturaNombre: d.facturaNombre || d.nombre })); setError(null); }}>
                <FileText className="h-5 w-5 shrink-0" />{c.giftInvoiceRequest}{datos.solicitaFactura && <Check className="h-5 w-5 shrink-0 ml-auto" />}
              </Button>
              <Button type="button" aria-pressed={!datos.solicitaFactura} disabled={enviando} variant="outline" className={`w-full min-h-14 ${!datos.solicitaFactura ? "border-accent bg-accent/10" : ""}`} onClick={() => { setDatos(d => ({ ...d, solicitaFactura: false })); setError(null); }}>{copy.no}</Button>
            </div> : final ? <dl className="rounded-xl bg-muted/50 p-4 text-sm space-y-3">
              {fields.filter(f => f.key in datos && String(datos[f.key as keyof DatosComprador] || "").trim()).map(f => <div key={f.key}><dt className="text-muted-foreground">{f.label}</dt><dd className="font-medium break-words whitespace-pre-wrap">{String(datos[f.key as keyof DatosComprador])}</dd></div>)}
              <div><dt className="text-muted-foreground">{copy.invoice}</dt><dd>{datos.solicitaFactura ? c.giftInvoiceRequest : copy.no}</dd></div>
            </dl> : <div className="space-y-3">
              <Label htmlFor={"gift-step-" + field.key} className="sr-only">{field.label}</Label>
              {field.type === "textarea" ? <Textarea id={"gift-step-" + field.key} className="text-base min-h-24 rounded-xl" rows={3} value={value} maxLength={field.max} autoComplete={field.complete} placeholder={field.placeholder} disabled={enviando} onChange={e => change(e.target.value)} /> :
                <Input id={"gift-step-" + field.key} className="h-14 text-base rounded-xl" type={field.type} inputMode={field.type === "email" ? "email" : field.type === "tel" ? "tel" : undefined} enterKeyHint="next" value={value} maxLength={field.max} autoComplete={field.complete} placeholder={field.placeholder} disabled={enviando} onChange={e => change(e.target.value)} />}
              {!field.required && <p className="text-xs text-center text-muted-foreground">{copy.optional}</p>}
            </div>}
            {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-3 border-t bg-background p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" className="h-12" disabled={enviando} onClick={() => { setError(null); if (step) setStep(s => s - 1); else onOpenChange(false); }}>{step ? copy.back : c.giftFormCancel}</Button>
          <Button type="submit" onMouseDown={e => e.preventDefault()} className="h-12 flex-1 bg-accent hover:bg-accent/90 whitespace-normal" disabled={enviando}>{enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{final ? enviando ? c.giftFormSubmitting : c.giftFormSubmit : copy.next}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
