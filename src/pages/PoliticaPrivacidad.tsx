import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { TelLink } from "@/components/TelLink";

const PoliticaPrivacidad = () => {
    return (
        <div className="min-h-screen bg-background">
            <Seo
                title="Política de Privacidad | Casa Tomás Restaurante"
                description="Información sobre el tratamiento de datos personales en Casa Tomás Restaurante (Crevillent, Alicante) conforme al RGPD."
                canonical="https://restaurantecasatomascrevillente.es/politica-privacidad"
                noindex
            />
            {/* Header */}
            <div className="bg-dark-slate text-background py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-stone hover:text-accent transition-colors mb-4 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al inicio
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold">Política de Privacidad</h1>
                    <p className="text-stone mt-2 text-sm">Última actualización: febrero de 2026</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 text-foreground">

                {/* 1. Responsable */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">1. Responsable del tratamiento</h2>
                    <div className="rounded-lg border border-border p-5 space-y-1 text-sm text-muted-foreground">
                        <p><strong className="text-foreground">Razón social:</strong> Restaurante Casa Tomás</p>
                        <p><strong className="text-foreground">Dirección:</strong> Carrer Santa Maria de la Cabeza, 2 — 03330 Crevillent (Alicante)</p>
                        <p><strong className="text-foreground">Teléfono:</strong> <TelLink className="text-accent hover:underline" /></p>
                        <p><strong className="text-foreground">Email:</strong> casatomascrevillent@gmail.com</p>
                    </div>
                </section>

                {/* 2. Qué datos recogemos */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">2. Datos que recogemos</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Recogemos únicamente los datos estrictamente necesarios para gestionar su reserva y prestarle el servicio:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
                        <li>Nombre y apellidos</li>
                        <li>Número de teléfono de contacto</li>
                        <li>Dirección de correo electrónico (opcional)</li>
                        <li>Fecha, hora y número de comensales de la reserva</li>
                        <li>Peticiones especiales o notas adicionales (si las indica)</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                        <strong className="text-foreground">Asistente telefónico:</strong> Cuando llama a nuestro número, su llamada puede ser atendida por un asistente de voz automatizado. En ese caso, el número de teléfono desde el que llama se registra automáticamente para vincular su reserva. La llamada puede ser grabada por razones de calidad y seguridad; en tal caso, le informaremos al inicio de la llamada.
                    </p>
                </section>

                {/* 3. Finalidades */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">3. Finalidades y base legal</h2>
                    <div className="space-y-3">
                        {[
                            {
                                fin: "Gestión de reservas",
                                base: "Ejecución de un contrato (Art. 6.1.b RGPD)",
                                desc: "Creación, consulta, modificación y cancelación de reservas en el restaurante.",
                            },
                            {
                                fin: "Comunicaciones relacionadas con la reserva",
                                base: "Interés legítimo (Art. 6.1.f RGPD)",
                                desc: "Confirmación, recordatorios o cancelaciones de su reserva por teléfono o email.",
                            },
                            {
                                fin: "Seguridad y prevención de abusos",
                                base: "Interés legítimo (Art. 6.1.f RGPD)",
                                desc: "Registro de llamadas y gestión de una lista de exclusión para prevenir el uso indebido del sistema de reservas.",
                            },
                            {
                                fin: "Newsletter (novedades y ofertas)",
                                base: "Consentimiento (Art. 6.1.a RGPD)",
                                desc: "Solo si marca la casilla de consentimiento explícita al reservar. Puede retirar su consentimiento y darse de baja en cualquier momento desde el enlace incluido en cada email.",
                            },
                        ].map((item) => (
                            <div key={item.fin} className="rounded-lg border border-border p-4">
                                <p className="font-semibold text-sm">{item.fin}</p>
                                <p className="text-xs text-accent mt-0.5">{item.base}</p>
                                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. Conservación */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">4. Plazos de conservación</h2>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                            <strong className="text-foreground">Reservas:</strong> Los datos de reservas se conservan durante el período de validez de la reserva y, una vez finalizada, durante un máximo de <strong>2 años</strong> para atender posibles reclamaciones.
                        </p>
                        <p>
                            <strong className="text-foreground">Registros de llamadas:</strong> Los registros generados por el asistente telefónico (número llamante, duración, resumen) se eliminan automáticamente a los <strong>3 meses</strong>.
                        </p>
                        <p>
                            <strong className="text-foreground">Cookies:</strong> Consulte nuestra política de cookies para los plazos específicos de cada cookie.
                        </p>
                    </div>
                </section>

                {/* 5. Cookies */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">5. Cookies</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Usamos cookies y almacenamiento local propios, todos necesarios para que la web funcione, y una cookie de terceros que solo se activa si la acepta en el aviso de cookies o en "Configurar cookies" (pie de página).
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        {[
                            {
                                nombre: "cookie_consent / cookieConsent",
                                tipo: "Propia · Necesaria",
                                duracion: "1 año",
                                fin: "Guarda su elección sobre cookies para no volver a preguntarle en cada visita.",
                            },
                            {
                                nombre: "language",
                                tipo: "Propia · Necesaria",
                                duracion: "Sin caducidad (hasta que borre los datos del navegador)",
                                fin: "Recuerda el idioma elegido (español, inglés o francés).",
                            },
                            {
                                nombre: "edad_vinos_confirmada",
                                tipo: "Propia · Necesaria",
                                duracion: "Sesión del navegador",
                                fin: "Recuerda que confirmó ser mayor de edad para ver la carta de vinos, mientras dure la visita.",
                            },
                            {
                                nombre: "user_session_id, pedidos, mi_mesa",
                                tipo: "Propia · Necesaria",
                                duracion: "Sesión del navegador",
                                fin: "Guardan el pedido y los ajustes de \"Mi mesa\" mientras lo está preparando, sin enviarlo a nuestros servidores hasta que lo comparte.",
                            },
                            {
                                nombre: "Mapbox (mapbox.com, events.mapbox.com)",
                                tipo: "Tercero · Opcional, requiere su consentimiento",
                                duracion: "Según la política de Mapbox",
                                fin: "Carga el mapa interactivo de la carta de vinos y envía datos de uso anónimos a Mapbox. Sin su consentimiento, el mapa no se carga.",
                            },
                        ].map((item) => (
                            <div key={item.nombre} className="rounded-lg border border-border p-4">
                                <p className="font-semibold text-sm text-foreground">{item.nombre}</p>
                                <p className="text-xs text-accent mt-0.5">{item.tipo} · {item.duracion}</p>
                                <p className="text-sm text-muted-foreground mt-1">{item.fin}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                        Puede cambiar su elección sobre la cookie opcional de Mapbox en cualquier momento desde "Configurar cookies", al pie de cualquier página, o borrando las cookies de este sitio desde los ajustes de su navegador.
                    </p>
                </section>

                {/* 6. Derechos RGPD */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">6. Sus derechos</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Conforme al RGPD y la Ley Orgánica 3/2018 (LOPD-GDD), puede ejercer los siguientes derechos:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { derecho: "Acceso", desc: "Conocer qué datos tenemos sobre usted." },
                            { derecho: "Rectificación", desc: "Corregir datos inexactos o incompletos." },
                            { derecho: "Supresión", desc: "Solicitar la eliminación de sus datos personales." },
                            { derecho: "Oposición", desc: "Oponerse a ciertos tratamientos basados en interés legítimo." },
                            { derecho: "Portabilidad", desc: "Recibir sus datos en formato estructurado y legible." },
                            { derecho: "Limitación", desc: "Solicitar que suspendamos el tratamiento en ciertos casos." },
                        ].map((item) => (
                            <div key={item.derecho} className="rounded-lg border border-border p-3">
                                <p className="font-semibold text-sm">{item.derecho}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                        Para ejercer cualquiera de estos derechos, contacte con nosotros en{" "}
                        <a href="mailto:casatomascrevillent@gmail.com" className="text-accent hover:underline">
                            casatomascrevillent@gmail.com
                        </a>{" "}
                        indicando su nombre, el derecho que desea ejercer y adjuntando una copia de su DNI o documento equivalente.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Si considera que el tratamiento no es conforme a la normativa, puede presentar una reclamación ante la{" "}
                        <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            Agencia Española de Protección de Datos (AEPD)
                        </a>.
                    </p>
                </section>

                {/* 7. Transferencias internacionales */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-accent">7. Proveedores de servicio y transferencias</h2>
                    <p className="text-sm text-muted-foreground mb-3">
                        Para prestar el servicio utilizamos los siguientes proveedores, que actúan como encargados del tratamiento y que cuentan con garantías adecuadas de protección de datos:
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p><strong className="text-foreground">Supabase (base de datos):</strong> Almacenamiento de reservas. Datos en la Unión Europea. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Política de privacidad</a></p>
                        <p><strong className="text-foreground">Vapi (asistente de voz IA):</strong> Procesamiento de llamadas telefónicas. <a href="https://vapi.ai/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Política de privacidad</a></p>
                        <p><strong className="text-foreground">OpenAI (modelo de lenguaje):</strong> Interpretación de las solicitudes verbales del usuario. <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Política de privacidad</a></p>
                        <p><strong className="text-foreground">Vercel (alojamiento web):</strong> Infraestructura de la aplicación. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Política de privacidad</a></p>
                        <p><strong className="text-foreground">Mapbox (mapa interactivo de vinos):</strong> Solo si acepta la cookie opcional del mapa. <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Política de privacidad</a></p>
                    </div>
                </section>

                {/* 8. Contacto */}
                <section className="rounded-lg bg-muted/40 border border-border p-6">
                    <h2 className="text-xl font-bold mb-2 text-accent">8. Contacto</h2>
                    <p className="text-sm text-muted-foreground">
                        Para cualquier consulta sobre privacidad o protección de datos, puede dirigirse a:
                    </p>
                    <div className="mt-3 text-sm space-y-1">
                        <p>📧 <a href="mailto:casatomascrevillent@gmail.com" className="text-accent hover:underline">casatomascrevillent@gmail.com</a></p>
                        <p>📞 <TelLink className="text-accent hover:underline" /></p>
                        <p>📍 Carrer Santa Maria de la Cabeza, 2 — 03330 Crevillent (Alicante)</p>
                    </div>
                </section>

            </div>

            {/* Footer simple. Tag `<footer>` real: MobileReserveCTA lo busca con
                `document.querySelector("footer")` para ocultar su barra fija
                al llegar aquí abajo. */}
            <footer className="bg-dark-slate text-stone text-center py-6 text-xs mt-8">
                <p>© {new Date().getFullYear()} Restaurante Casa Tomás · Todos los derechos reservados</p>
                <p className="mt-1">
                    <Link to="/" className="hover:text-accent transition-colors">Inicio</Link>
                    {" · "}
                    <Link to="/politica-privacidad" className="hover:text-accent transition-colors">Política de Privacidad</Link>
                </p>
            </footer>
        </div>
    );
};

export default PoliticaPrivacidad;
