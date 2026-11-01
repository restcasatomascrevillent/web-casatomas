import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { TelLink } from "@/components/TelLink";
import { TextoRico } from "@/components/TextoRico";
import { useTranslations } from "@/i18n/LanguageProvider";
import { construirRutaIdioma } from "@/i18n/routing";
import {
    ANCLA_CONDICIONES_NEWSLETTER,
    CONDICIONES_PATH,
    POLITICA_PRIVACIDAD_PATH,
} from "@/lib/condiciones";
import { NEGOCIO, SITE_URL } from "@/lib/negocio";
import { RESPONSABLE_TRATAMIENTO, TEXTOS_PRIVACIDAD } from "@/lib/politica-privacidad-textos";

/**
 * Política de privacidad (es/en/fr). Existe en las tres ramas
 * (`/politica-privacidad`, `/en/politica-privacidad`,
 * `/fr/politica-privacidad`) y es `noindex` en las tres, como las condiciones:
 * por eso no lleva `hreflang`. El texto vive en `politica-privacidad-textos.ts`;
 * los datos del responsable (razón social, dirección, teléfono, email) son los
 * mismos en los tres idiomas.
 */
const PoliticaPrivacidad = () => {
    const { language } = useTranslations();
    const p = TEXTOS_PRIVACIDAD[language];
    const inicio = construirRutaIdioma("/", language);
    const rutaPolitica = construirRutaIdioma(POLITICA_PRIVACIDAD_PATH, language);

    return (
        <div className="min-h-screen bg-background">
            <Seo
                title={p.seoTitle}
                description={p.seoDescription}
                canonical={`${SITE_URL}${rutaPolitica}`}
                lang={language}
                noindex
            />
            {/* Header */}
            <div className="bg-dark-slate text-background py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <Link
                        to={inicio}
                        className="inline-flex items-center gap-2 text-stone-light hover:text-gold-light transition-colors mb-4 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {p.back}
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold">{p.title}</h1>
                    <p className="text-stone-light mt-2 text-sm">{p.updated}</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 text-foreground">

                {/* 1. Responsable */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">{p.controller.heading}</h2>
                    <div className="rounded-lg border border-border p-5 space-y-1 text-sm text-muted-foreground">
                        <p><strong className="text-foreground">{p.controller.companyLabel}</strong> {RESPONSABLE_TRATAMIENTO.razonSocial}</p>
                        <p><strong className="text-foreground">{p.controller.addressLabel}</strong> {RESPONSABLE_TRATAMIENTO.direccion}</p>
                        <p><strong className="text-foreground">{p.controller.phoneLabel}</strong> <TelLink className="text-accent hover:underline" /></p>
                        <p><strong className="text-foreground">{p.controller.emailLabel}</strong> {NEGOCIO.email}</p>
                    </div>
                </section>

                {/* 2. Qué datos recogemos */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">{p.data.heading}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{p.data.intro}</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                        {p.data.items.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                        <strong className="text-foreground">{p.data.assistantLabel}</strong> {p.data.assistant}
                    </p>
                </section>

                {/* 3. Finalidades */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">{p.purposes.heading}</h2>
                    <div className="space-y-3">
                        {p.purposes.items.map((item) => (
                            <div key={item.purpose} className="rounded-lg border border-border p-4">
                                <p className="font-semibold text-sm">{item.purpose}</p>
                                <p className="text-xs text-accent mt-0.5">{item.basis}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                    {item.conditionsLink && (
                                        <>
                                            {" "}
                                            <Link
                                                to={`${construirRutaIdioma(CONDICIONES_PATH, language)}#${ANCLA_CONDICIONES_NEWSLETTER}`}
                                                className="text-accent hover:underline"
                                            >
                                                {p.purposes.conditionsLinkText}
                                            </Link>
                                        </>
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. Conservación */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">{p.retention.heading}</h2>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        {p.retention.items.map((item) => (
                            <p key={item.label}>
                                <strong className="text-foreground">{item.label}</strong> <TextoRico texto={item.text} />
                            </p>
                        ))}
                    </div>
                </section>

                {/* 5. Cookies */}
                <section id="cookies" className="scroll-mt-28">
                    <h2 className="text-xl font-bold mb-3 text-accent">{p.cookies.heading}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{p.cookies.intro}</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        {p.cookies.items.map((item) => (
                            <div key={item.name} className="rounded-lg border border-border p-4">
                                <p className="font-semibold text-sm text-foreground">{item.name}</p>
                                <p className="text-xs text-accent mt-0.5">{item.type} · {item.duration}</p>
                                <p className="text-sm text-muted-foreground mt-1">{item.purpose}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">{p.cookies.outro}</p>
                </section>

                {/* 6. Derechos RGPD */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">{p.rights.heading}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{p.rights.intro}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {p.rights.items.map((item) => (
                            <div key={item.right} className="rounded-lg border border-border p-3">
                                <p className="font-semibold text-sm">{item.right}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                        <TextoRico texto={p.rights.exercise} />
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        <TextoRico texto={p.rights.complaint} />
                    </p>
                </section>

                {/* 7. Transferencias internacionales */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">{p.providers.heading}</h2>
                    <p className="text-sm text-muted-foreground mb-3">{p.providers.intro}</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        {p.providers.items.map((item) => (
                            <p key={item.name}>
                                <strong className="text-foreground">{item.name}</strong> {item.text}
                                {item.href && (
                                    <>
                                        {" "}
                                        <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                                            {p.providers.privacyLinkLabel}
                                        </a>
                                    </>
                                )}
                            </p>
                        ))}
                    </div>
                </section>

                {/* 8. Contacto */}
                <section className="rounded-lg bg-muted/20 border border-border p-6">
                    <h2 className="text-xl font-bold mb-2 text-accent">{p.contact.heading}</h2>
                    <p className="text-sm text-muted-foreground">{p.contact.intro}</p>
                    <div className="mt-3 text-sm space-y-1">
                        <p>📧 <a href={`mailto:${NEGOCIO.email}`} className="text-accent hover:underline">{NEGOCIO.email}</a></p>
                        <p>📞 <TelLink className="text-accent hover:underline" /></p>
                        <p>📍 {RESPONSABLE_TRATAMIENTO.direccion}</p>
                    </div>
                </section>

            </div>

            {/* Footer simple. Tag `<footer>` real: MobileReserveCTA lo busca con
                `document.querySelector("footer")` para ocultar su barra fija
                al llegar aquí abajo. */}
            <footer className="bg-dark-slate text-stone-light text-center py-6 text-xs mt-8">
                <p>{p.footer.rights.replace("{year}", String(new Date().getFullYear()))}</p>
                <p className="mt-1">
                    <Link to={inicio} className="hover:text-gold-light transition-colors">{p.footer.home}</Link>
                    {" · "}
                    <Link to={rutaPolitica} className="hover:text-gold-light transition-colors">{p.footer.privacy}</Link>
                    {" · "}
                    <Link to={construirRutaIdioma(CONDICIONES_PATH, language)} className="hover:text-gold-light transition-colors">{p.footer.conditions}</Link>
                </p>
            </footer>
        </div>
    );
};

export default PoliticaPrivacidad;
