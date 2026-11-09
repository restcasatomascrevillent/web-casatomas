/**
 * Textos de la política de privacidad en los tres idiomas.
 *
 * Viven aquí y no en `src/i18n/languages/*.ts` a propósito: los diccionarios se
 * cargan SIEMPRE en el bundle de arranque, y esto es un texto largo que solo
 * necesita la página `PoliticaPrivacidad` (que es una ruta perezosa). Así el
 * peso de los tres idiomas viaja solo con ella.
 *
 * El español es el texto de referencia (el que firma el responsable); inglés y
 * francés son su traducción fiel, apartado por apartado: mismo orden, mismas
 * cifras (2 años, 3 meses, 12 meses, 6 años), mismas bases legales y mismos
 * datos del responsable. Si se cambia el español, hay que cambiar los otros dos
 * (un test comprueba que los tres tienen la misma estructura y las mismas
 * cifras).
 *
 * Revisión del 04/11/2026 (petición del dueño: «básate en la información real
 * de la web»): responsable = la sociedad titular (MASIDE 2011, S.L.U., no el nombre
 * comercial), y todo lo que la web trata de verdad: reservas, newsletter,
 * cheques regalo (pago con Stripe y factura), asistente de la web (chat con
 * OpenAI), asistente telefónico, votación del vino favorito y estadísticas
 * anónimas (Vercel Web Analytics, sin cookies). Proveedores con su nombre y las
 * transferencias a EE. UU.
 *
 * Los párrafos admiten un marcado mínimo (`renderTextoRico` en la página):
 * `**negrita**`, `[texto](https://enlace)`, `{phone}` y `{email}`.
 */
import type { Language } from "../i18n/types";
import { TITULAR } from "./titular";

export interface TextosPrivacidad {
  seoTitle: string;
  seoDescription: string;
  back: string;
  title: string;
  updated: string;
  controller: {
    heading: string;
    companyLabel: string;
    tradeNameLabel: string;
    taxIdLabel: string;
    addressLabel: string;
    phoneLabel: string;
    emailLabel: string;
  };
  data: {
    heading: string;
    intro: string;
    items: readonly string[];
    assistantLabel: string;
    assistant: string;
  };
  purposes: {
    heading: string;
    items: readonly { purpose: string; basis: string; description: string; conditionsLink?: boolean }[];
    conditionsLinkText: string;
  };
  retention: {
    heading: string;
    items: readonly { label: string; text: string }[];
  };
  cookies: {
    heading: string;
    intro: string;
    items: readonly { name: string; type: string; duration: string; purpose: string }[];
    outro: string;
  };
  rights: {
    heading: string;
    intro: string;
    items: readonly { right: string; description: string }[];
    exercise: string;
    complaint: string;
  };
  providers: {
    heading: string;
    intro: string;
    privacyLinkLabel: string;
    items: readonly { name: string; text: string; href?: string }[];
  };
  contact: {
    heading: string;
    intro: string;
  };
}

/** Datos del responsable: iguales en los tres idiomas (no se traducen). Fuente: `TITULAR`. */
export const RESPONSABLE_TRATAMIENTO = {
  razonSocial: TITULAR.denominacionSocial,
  nombreComercial: TITULAR.nombreComercial,
  cif: TITULAR.cif,
  direccion: TITULAR.domicilio,
} as const;

const es: TextosPrivacidad = {
  seoTitle: "Política de Privacidad | Casa Tomás Restaurante",
  seoDescription:
    "Información sobre el tratamiento de datos personales en Casa Tomás Restaurante (Crevillent, Alicante) conforme al RGPD.",
  back: "Volver al inicio",
  title: "Política de Privacidad",
  updated: "Última actualización: noviembre de 2026",
  controller: {
    heading: "1. Responsable del tratamiento",
    companyLabel: "Razón social:",
    tradeNameLabel: "Nombre comercial:",
    taxIdLabel: "CIF:",
    addressLabel: "Dirección:",
    phoneLabel: "Teléfono:",
    emailLabel: "Email:",
  },
  data: {
    heading: "2. Datos que recogemos",
    intro:
      "Solo recogemos los datos necesarios para cada servicio que usa. Nuestros servicios no se dirigen a menores de 14 años.",
    items: [
      "Reservas: nombre y apellidos, teléfono, email (opcional), fecha, hora y número de comensales, y las peticiones especiales que nos indique.",
      "Newsletter: su nombre y email, su consentimiento, la fecha en que lo dio y la fecha en que confirmó su email.",
      "Cheques regalo: nombre, email y teléfono (opcional) de quien compra; nombre de quien lo recibe y dedicatoria (opcionales); y, si pide factura, nombre o razón social, NIF y dirección. El pago lo procesa Stripe: no vemos ni guardamos los datos de su tarjeta.",
      "Asistente de la web (chat): los mensajes que escribe. No incluya en el chat datos de salud ni otros datos sensibles; para alergias, hable con el personal.",
      "Votación «Vota tu vino favorito»: nombre, email o teléfono y el vino votado.",
      "Navegación: estadísticas de visitas anónimas y agregadas, sin cookies, y los registros técnicos del servidor (dirección IP, fecha y página visitada) por seguridad. Si acepta «Estadísticas de uso», también las páginas que ve y las acciones que hace en la web (botones, platos o vinos que abre, pasos de los formularios), unidas por un identificador aleatorio, nunca su nombre ni lo que escribe en los formularios. Y siempre, los errores técnicos de la web, sin datos personales.",
    ],
    assistantLabel: "Asistente telefónico:",
    assistant:
      "Cuando llama a nuestro número, su llamada puede ser atendida por un asistente de voz automatizado. En ese caso, el número de teléfono desde el que llama se registra automáticamente para vincular su reserva. La llamada puede ser grabada por razones de calidad y seguridad; en tal caso, le informaremos al inicio de la llamada.",
  },
  purposes: {
    heading: "3. Finalidades y base legal",
    items: [
      {
        purpose: "Gestión de reservas",
        basis: "Ejecución de un contrato (Art. 6.1.b RGPD)",
        description: "Creación, consulta, modificación y cancelación de reservas en el restaurante.",
      },
      {
        purpose: "Comunicaciones relacionadas con la reserva",
        basis: "Interés legítimo (Art. 6.1.f RGPD)",
        description: "Confirmación, recordatorios o cancelaciones de su reserva por teléfono o email.",
      },
      {
        purpose: "Seguridad y prevención de abusos",
        basis: "Interés legítimo (Art. 6.1.f RGPD)",
        description:
          "Registro de llamadas, límites de uso de los formularios y una lista de exclusión para prevenir el uso indebido del sistema de reservas.",
      },
      {
        purpose: "Newsletter (novedades y ofertas)",
        basis: "Consentimiento (Art. 6.1.a RGPD)",
        description:
          "Envío ocasional de novedades, eventos, menús especiales y ofertas de Casa Tomás a su email, usando el nombre y el email de la reserva. Solo si marca la casilla específica de la newsletter al reservar: es independiente de la aceptación de las condiciones de reserva, está desmarcada por defecto y no es necesaria para reservar. Marcar la casilla no le suscribe todavía: le damos de alta solo cuando confirma su reserva desde el enlace del email que le enviamos (doble verificación), lo que acredita que el email es suyo; si la reserva se confirma por otra vía (por ejemplo, por teléfono) o se cancela antes, no le suscribimos. Puede retirar su consentimiento y darse de baja en cualquier momento, sin coste, desde el enlace incluido en cada email; la baja es inmediata.",
        conditionsLink: true,
      },
      {
        purpose: "Venta de cheques regalo",
        basis: "Ejecución de un contrato (Art. 6.1.b RGPD)",
        description: "Cobrar el cheque, enviárselo por email con su código y comprobarlo cuando se canjea en el restaurante.",
      },
      {
        purpose: "Facturación y contabilidad",
        basis: "Obligación legal (Art. 6.1.c RGPD)",
        description: "Emitir la factura si la pide y conservar los justificantes de las ventas que exige la normativa fiscal y mercantil.",
      },
      {
        purpose: "Asistente de la web (chat)",
        basis: "Medidas precontractuales a petición suya (Art. 6.1.b RGPD)",
        description:
          "Responder a lo que pregunta sobre la carta, los horarios o las reservas. Las respuestas se generan de forma automática y no se toma ninguna decisión sobre usted con ellas.",
      },
      {
        purpose: "Votación del vino favorito y sorteo",
        basis: "Consentimiento (Art. 6.1.a RGPD)",
        description: "Contar los votos, hacer el sorteo entre quienes participan y avisar a quien gane. Un voto por email o teléfono.",
      },
      {
        purpose: "Estadísticas de uso de la web",
        basis: "Interés legítimo (Art. 6.1.f RGPD)",
        description: "Saber cuántas visitas recibe cada página, de forma anónima y agregada, para mejorar la web.",
      },
      {
        purpose: "Estadísticas de uso propias (recorridos)",
        basis: "Consentimiento (Art. 6.1.a RGPD)",
        description: "Solo si acepta «Estadísticas de uso»: saber qué páginas y botones se usan en una visita, qué se consulta de la carta y dónde se abandona una reserva o una compra, para mejorar la web. Puede retirar el consentimiento en cualquier momento desde «Configurar cookies».",
      },
      {
        purpose: "Detección de errores de la web",
        basis: "Interés legítimo (Art. 6.1.f RGPD)",
        description: "Registrar los fallos técnicos de la web (sin datos personales ni identificadores) para corregirlos.",
      },
    ],
    conditionsLinkText: "Ver las condiciones de la newsletter",
  },
  retention: {
    heading: "4. Plazos de conservación",
    items: [
      {
        label: "Reservas:",
        text: "Los datos de reservas se conservan durante el período de validez de la reserva y, una vez finalizada, durante un máximo de **2 años** para atender posibles reclamaciones.",
      },
      {
        label: "Registros de llamadas:",
        text: "Los registros generados por el asistente telefónico (número llamante, duración, resumen) se eliminan automáticamente a los **3 meses**.",
      },
      {
        label: "Conversaciones del chat:",
        text: "Se conservan un máximo de **12 meses** para atender consultas y mejorar las respuestas; después se borran.",
      },
      {
        label: "Cheques regalo y facturas:",
        text: "Mientras el cheque sea válido y, después, durante **6 años**, el plazo que exige la normativa mercantil y fiscal para los justificantes de las ventas.",
      },
      {
        label: "Votación del vino favorito:",
        text: "Hasta que se celebre el sorteo y se avise a quien gane; después se borran todas las participaciones.",
      },
      {
        label: "Newsletter:",
        text: "Mientras no retire su consentimiento. Al darse de baja dejamos de enviarle la newsletter de inmediato; podemos conservar la constancia de su consentimiento, de la confirmación de su email y de su baja durante el tiempo necesario para acreditarlos ante posibles reclamaciones.",
      },
      {
        label: "Estadísticas y errores de la web:",
        text: "Las estadísticas de uso propias se borran a los **90 días** y los errores técnicos a los **180 días**.",
      },
      {
        label: "Cookies:",
        text: "Consulte el apartado de cookies para los plazos específicos de cada cookie.",
      },
    ],
  },
  cookies: {
    heading: "5. Cookies",
    intro:
      'Usamos cookies y almacenamiento local propios, necesarios para que la web funcione o para recordar lo que usted ha elegido, y dos opcionales (las estadísticas de uso propias y el mapa de terceros) que solo se activan si las acepta en el aviso de cookies o en "Configurar cookies" (pie de página). Las estadísticas de visitas de Vercel no usan cookies.',
    items: [
      {
        name: "cookie_consent / cookieConsent",
        type: "Propia · Necesaria",
        duration: "1 año",
        purpose: "Guarda su elección sobre cookies para no volver a preguntarle en cada visita.",
      },
      {
        name: "language",
        type: "Propia · Necesaria",
        duration: "Sin caducidad (hasta que borre los datos del navegador)",
        purpose: "Recuerda el idioma elegido (español, inglés o francés).",
      },
      {
        name: "edad_vinos_confirmada",
        type: "Propia · Necesaria",
        duration: "Sesión del navegador",
        purpose: "Recuerda que confirmó ser mayor de edad para ver la carta de vinos, mientras dure la visita.",
      },
      {
        name: "user_session_id, pedidos, mi_mesa",
        type: "Propia · Necesaria",
        duration: "Sesión del navegador",
        purpose:
          'Guardan el pedido y los ajustes de "Mi mesa" mientras lo está preparando, sin enviarlo a nuestros servidores hasta que lo comparte.',
      },
      {
        name: "ct_voto_vino_favorito",
        type: "Propia · Necesaria",
        duration: "Sin caducidad (hasta que borre los datos del navegador)",
        purpose: "Recuerda que ya votó su vino favorito para no volver a pedírselo.",
      },
      {
        name: "Stripe (checkout.stripe.com)",
        type: "Tercero · Necesaria para el pago",
        duration: "Según la política de Stripe",
        purpose:
          "Solo en la página de pago de Stripe al comprar un cheque regalo: prevención del fraude y funcionamiento del pago.",
      },
      {
        name: "ct_actividad",
        type: "Propia · Opcional, requiere su consentimiento",
        duration: "6 meses",
        purpose:
          "Estadísticas de uso propias: un identificador aleatorio del navegador y de la visita (30 minutos sin actividad abren otra) para unir las páginas y acciones de una misma visita. No contiene datos personales y no se comparte con terceros. Sin su consentimiento no se crea.",
      },
      {
        name: "ct_interno",
        type: "Propia · Necesaria",
        duration: "Sin caducidad (hasta que borre los datos del navegador)",
        purpose: "Solo en los dispositivos del personal del restaurante: marca sus visitas para excluirlas de las estadísticas.",
      },
      {
        name: "Mapbox (mapbox.com, events.mapbox.com)",
        type: "Tercero · Opcional, requiere su consentimiento",
        duration: "Según la política de Mapbox",
        purpose:
          "Carga el mapa interactivo de la carta de vinos y envía datos de uso anónimos a Mapbox. Sin su consentimiento, el mapa no se carga.",
      },
    ],
    outro:
      'Puede cambiar su elección sobre las estadísticas de uso y la cookie de Mapbox en cualquier momento desde "Configurar cookies", al pie de cualquier página, o borrando las cookies de este sitio desde los ajustes de su navegador. Si su navegador envía la señal Global Privacy Control, no activamos las estadísticas de uso.',
  },
  rights: {
    heading: "6. Sus derechos",
    intro:
      "Conforme al RGPD y la Ley Orgánica 3/2018 (LOPD-GDD), puede ejercer los siguientes derechos:",
    items: [
      { right: "Acceso", description: "Conocer qué datos tenemos sobre usted." },
      { right: "Rectificación", description: "Corregir datos inexactos o incompletos." },
      { right: "Supresión", description: "Solicitar la eliminación de sus datos personales." },
      { right: "Oposición", description: "Oponerse a ciertos tratamientos basados en interés legítimo." },
      { right: "Portabilidad", description: "Recibir sus datos en formato estructurado y legible." },
      { right: "Limitación", description: "Solicitar que suspendamos el tratamiento en ciertos casos." },
      { right: "Retirar el consentimiento", description: "En la newsletter y la votación, en cualquier momento y sin que afecte a lo anterior." },
    ],
    exercise:
      "Para ejercer cualquiera de estos derechos, contacte con nosotros en {email} indicando su nombre, el derecho que desea ejercer y adjuntando una copia de su DNI o documento equivalente.",
    complaint:
      "Si considera que el tratamiento no es conforme a la normativa, puede presentar una reclamación ante la [Agencia Española de Protección de Datos (AEPD)](https://www.aepd.es).",
  },
  providers: {
    heading: "7. Proveedores de servicio y transferencias",
    intro:
      "Para prestar el servicio utilizamos los siguientes proveedores, que tratan los datos por nuestra cuenta y con contrato de encargo. Algunos están en Estados Unidos: la transferencia se ampara en el Marco de Privacidad de Datos UE-EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea.",
    privacyLinkLabel: "Política de privacidad",
    items: [
      {
        name: "Supabase (base de datos):",
        text: "Almacenamiento de reservas, cheques regalo, conversaciones del chat, votos y estadísticas de uso y errores de la web. Servidores en la Unión Europea (Irlanda).",
        href: "https://supabase.com/privacy",
      },
      {
        name: "Vapi (asistente de voz IA):",
        text: "Procesamiento de las llamadas telefónicas. Estados Unidos.",
        href: "https://vapi.ai/privacy",
      },
      {
        name: "OpenAI (modelo de lenguaje):",
        text: "Interpretación de las llamadas y respuestas del asistente de la web (chat). Estados Unidos.",
        href: "https://openai.com/policies/privacy-policy",
      },
      {
        name: "Vercel (alojamiento web):",
        text: "Infraestructura de la web y estadísticas de visitas anónimas. Estados Unidos.",
        href: "https://vercel.com/legal/privacy-policy",
      },
      {
        name: "Resend (envío de emails):",
        text: "Envío de los emails de la reserva, de los cheques regalo y, si se ha suscrito, de la newsletter. Estados Unidos.",
        href: "https://resend.com/legal/privacy-policy",
      },
      {
        name: "Stripe (pagos):",
        text: "Cobro de los cheques regalo con tarjeta. Stripe trata los datos de pago como responsable independiente.",
        href: "https://stripe.com/es/privacy",
      },
      {
        name: "Mapbox (mapa interactivo de vinos):",
        text: "Solo si acepta la cookie opcional del mapa.",
        href: "https://www.mapbox.com/legal/privacy",
      },
    ],
  },
  contact: {
    heading: "8. Contacto",
    intro: "Para cualquier consulta sobre privacidad o protección de datos, puede dirigirse a:",
  },
};

const en: TextosPrivacidad = {
  seoTitle: "Privacy Policy | Casa Tomás Restaurant",
  seoDescription:
    "Information on the processing of personal data at Casa Tomás Restaurant (Crevillent, Alicante) in accordance with the GDPR.",
  back: "Back to home",
  title: "Privacy Policy",
  updated: "Last updated: November 2026",
  controller: {
    heading: "1. Data controller",
    companyLabel: "Company name:",
    tradeNameLabel: "Trade name:",
    taxIdLabel: "Tax ID (CIF):",
    addressLabel: "Address:",
    phoneLabel: "Phone:",
    emailLabel: "Email:",
  },
  data: {
    heading: "2. Data we collect",
    intro:
      "We only collect the data needed for each service you use. Our services are not aimed at children under 14.",
    items: [
      "Bookings: first name and surname, telephone, email (optional), date, time and number of guests, and any special requests you give us.",
      "Newsletter: your name and email, your consent, the date you gave it and the date you confirmed your email.",
      "Gift vouchers: name, email and telephone (optional) of the buyer; name of the recipient and dedication (optional); and, if you ask for an invoice, name or company name, tax ID and address. Payment is processed by Stripe: we never see or store your card details.",
      "Website assistant (chat): the messages you write. Please do not include health data or other sensitive data in the chat; for allergies, speak to our staff.",
      "“Vote for your favourite wine”: name, email or telephone and the wine you voted for.",
      "Browsing: anonymous, aggregated visit statistics, without cookies, and the server's technical logs (IP address, date and page visited) for security. If you accept “Usage statistics”, also the pages you view and the actions you take on the website (buttons, dishes or wines you open, form steps), linked by a random identifier, never your name or what you type in forms. And always, the website's technical errors, without personal data.",
    ],
    assistantLabel: "Phone assistant:",
    assistant:
      "When you call our number, your call may be answered by an automated voice assistant. In that case, the telephone number you are calling from is automatically recorded in order to link it to your booking. The call may be recorded for quality and security reasons; if so, we will inform you at the start of the call.",
  },
  purposes: {
    heading: "3. Purposes and legal basis",
    items: [
      {
        purpose: "Booking management",
        basis: "Performance of a contract (Art. 6.1.b GDPR)",
        description: "Creation, consultation, modification and cancellation of bookings at the restaurant.",
      },
      {
        purpose: "Communications related to the booking",
        basis: "Legitimate interest (Art. 6.1.f GDPR)",
        description: "Confirmation, reminders or cancellations of your booking by phone or email.",
      },
      {
        purpose: "Security and abuse prevention",
        basis: "Legitimate interest (Art. 6.1.f GDPR)",
        description:
          "Call logging, usage limits on the forms and an exclusion list to prevent misuse of the booking system.",
      },
      {
        purpose: "Newsletter (news and offers)",
        basis: "Consent (Art. 6.1.a GDPR)",
        description:
          "Occasional sending of news, events, special menus and offers from Casa Tomás to your email, using the name and email from the booking. Only if you tick the specific newsletter checkbox when booking: it is independent of the acceptance of the booking conditions, is unticked by default and is not necessary in order to book. Ticking the checkbox does not subscribe you yet: we only sign you up when you confirm your booking from the link in the email we send you (double verification), which proves that the email is yours; if the booking is confirmed by another route (for example, by phone) or is cancelled beforehand, we do not subscribe you. You may withdraw your consent and unsubscribe at any time, free of charge, from the link included in every email; unsubscribing takes effect immediately.",
        conditionsLink: true,
      },
      {
        purpose: "Sale of gift vouchers",
        basis: "Performance of a contract (Art. 6.1.b GDPR)",
        description: "Charging for the voucher, emailing it to you with its code and checking it when it is redeemed at the restaurant.",
      },
      {
        purpose: "Invoicing and accounting",
        basis: "Legal obligation (Art. 6.1.c GDPR)",
        description: "Issuing the invoice if you ask for one and keeping the sales records required by tax and commercial law.",
      },
      {
        purpose: "Website assistant (chat)",
        basis: "Pre-contractual steps at your request (Art. 6.1.b GDPR)",
        description:
          "Answering your questions about the menu, opening hours or bookings. Answers are generated automatically and no decision is taken about you based on them.",
      },
      {
        purpose: "Favourite wine vote and prize draw",
        basis: "Consent (Art. 6.1.a GDPR)",
        description: "Counting the votes, holding the draw among participants and notifying the winner. One vote per email or telephone.",
      },
      {
        purpose: "Website usage statistics",
        basis: "Legitimate interest (Art. 6.1.f GDPR)",
        description: "Knowing how many visits each page receives, anonymously and in aggregate, in order to improve the website.",
      },
      {
        purpose: "Our own usage statistics (journeys)",
        basis: "Consent (Art. 6.1.a GDPR)",
        description: "Only if you accept “Usage statistics”: knowing which pages and buttons are used during a visit, what is viewed on the menu and where a booking or a purchase is abandoned, in order to improve the website. You can withdraw your consent at any time from “Cookie settings”.",
      },
      {
        purpose: "Detection of website errors",
        basis: "Legitimate interest (Art. 6.1.f GDPR)",
        description: "Recording the website's technical failures (without personal data or identifiers) in order to fix them.",
      },
    ],
    conditionsLinkText: "See the newsletter conditions",
  },
  retention: {
    heading: "4. Retention periods",
    items: [
      {
        label: "Bookings:",
        text: "Booking data is kept for the period of validity of the booking and, once it has ended, for a maximum of **2 years** to deal with possible claims.",
      },
      {
        label: "Call logs:",
        text: "The records generated by the phone assistant (calling number, duration, summary) are automatically deleted after **3 months**.",
      },
      {
        label: "Chat conversations:",
        text: "They are kept for a maximum of **12 months** to deal with queries and improve the answers; they are then deleted.",
      },
      {
        label: "Gift vouchers and invoices:",
        text: "For as long as the voucher is valid and, afterwards, for **6 years**, the period required by commercial and tax law for sales records.",
      },
      {
        label: "Favourite wine vote:",
        text: "Until the draw has been held and the winner notified; all entries are then deleted.",
      },
      {
        label: "Newsletter:",
        text: "For as long as you do not withdraw your consent. When you unsubscribe we stop sending you the newsletter immediately; we may keep the record of your consent, of the confirmation of your email and of your unsubscription for as long as necessary to prove them in the event of claims.",
      },
      {
        label: "Website statistics and errors:",
        text: "Our own usage statistics are deleted after **90 days** and technical errors after **180 days**.",
      },
      {
        label: "Cookies:",
        text: "See the cookies section for the specific periods of each cookie.",
      },
    ],
  },
  cookies: {
    heading: "5. Cookies",
    intro:
      'We use our own cookies and local storage, necessary for the website to work or to remember what you have chosen, and two optional ones (our own usage statistics and the third-party map) that are only activated if you accept them in the cookie notice or in "Cookie settings" (footer). Vercel\'s visit statistics do not use cookies.',
    items: [
      {
        name: "cookie_consent / cookieConsent",
        type: "First-party · Necessary",
        duration: "1 year",
        purpose: "Stores your cookie choice so that we do not ask you again on every visit.",
      },
      {
        name: "language",
        type: "First-party · Necessary",
        duration: "No expiry (until you clear your browser data)",
        purpose: "Remembers the language you chose (Spanish, English or French).",
      },
      {
        name: "edad_vinos_confirmada",
        type: "First-party · Necessary",
        duration: "Browser session",
        purpose: "Remembers that you confirmed you are of legal age to view the wine list, for the duration of your visit.",
      },
      {
        name: "user_session_id, pedidos, mi_mesa",
        type: "First-party · Necessary",
        duration: "Browser session",
        purpose:
          'Store your order and your "My table" settings while you are preparing them, without sending them to our servers until you share them.',
      },
      {
        name: "ct_voto_vino_favorito",
        type: "First-party · Necessary",
        duration: "No expiry (until you clear your browser data)",
        purpose: "Remembers that you have already voted for your favourite wine so that we do not ask you again.",
      },
      {
        name: "Stripe (checkout.stripe.com)",
        type: "Third-party · Necessary for payment",
        duration: "According to Stripe's policy",
        purpose:
          "Only on Stripe's payment page when you buy a gift voucher: fraud prevention and operation of the payment.",
      },
      {
        name: "ct_actividad",
        type: "First-party · Optional, requires your consent",
        duration: "6 months",
        purpose:
          "Our own usage statistics: a random identifier for the browser and the visit (30 minutes without activity start a new one) to link the pages and actions of the same visit. It contains no personal data and is not shared with third parties. Without your consent it is not created.",
      },
      {
        name: "ct_interno",
        type: "First-party · Necessary",
        duration: "No expiry (until you clear your browser data)",
        purpose: "Only on the restaurant staff's devices: marks their visits so they are excluded from the statistics.",
      },
      {
        name: "Mapbox (mapbox.com, events.mapbox.com)",
        type: "Third-party · Optional, requires your consent",
        duration: "According to Mapbox's policy",
        purpose:
          "Loads the interactive map on the wine list and sends anonymous usage data to Mapbox. Without your consent, the map is not loaded.",
      },
    ],
    outro:
      'You can change your choice about usage statistics and the Mapbox cookie at any time from "Cookie settings", at the bottom of any page, or by deleting this site\'s cookies in your browser settings. If your browser sends the Global Privacy Control signal, we do not activate usage statistics.',
  },
  rights: {
    heading: "6. Your rights",
    intro:
      "In accordance with the GDPR and Spanish Organic Law 3/2018 (LOPD-GDD), you may exercise the following rights:",
    items: [
      { right: "Access", description: "Find out what data we hold about you." },
      { right: "Rectification", description: "Correct inaccurate or incomplete data." },
      { right: "Erasure", description: "Request the deletion of your personal data." },
      { right: "Objection", description: "Object to certain processing based on legitimate interest." },
      { right: "Portability", description: "Receive your data in a structured, readable format." },
      { right: "Restriction", description: "Ask us to suspend processing in certain cases." },
      { right: "Withdraw consent", description: "For the newsletter and the vote, at any time and without affecting earlier processing." },
    ],
    exercise:
      "To exercise any of these rights, contact us at {email} stating your name and the right you wish to exercise, and attaching a copy of your ID card or equivalent document.",
    complaint:
      "If you consider that the processing does not comply with the regulations, you can lodge a complaint with the [Spanish Data Protection Agency (AEPD)](https://www.aepd.es).",
  },
  providers: {
    heading: "7. Service providers and transfers",
    intro:
      "To provide the service we use the following providers, which process data on our behalf under a data processing agreement. Some are located in the United States: the transfer is covered by the EU-US Data Privacy Framework or by the European Commission's standard contractual clauses.",
    privacyLinkLabel: "Privacy policy",
    items: [
      {
        name: "Supabase (database):",
        text: "Storage of bookings, gift vouchers, chat conversations, votes and website usage statistics and errors. Servers in the European Union (Ireland).",
        href: "https://supabase.com/privacy",
      },
      {
        name: "Vapi (AI voice assistant):",
        text: "Processing of telephone calls. United States.",
        href: "https://vapi.ai/privacy",
      },
      {
        name: "OpenAI (language model):",
        text: "Interpretation of calls and answers from the website assistant (chat). United States.",
        href: "https://openai.com/policies/privacy-policy",
      },
      {
        name: "Vercel (web hosting):",
        text: "Website infrastructure and anonymous visit statistics. United States.",
        href: "https://vercel.com/legal/privacy-policy",
      },
      {
        name: "Resend (email sending):",
        text: "Sending the booking emails, the gift vouchers and, if you have subscribed, the newsletter. United States.",
        href: "https://resend.com/legal/privacy-policy",
      },
      {
        name: "Stripe (payments):",
        text: "Card payment for gift vouchers. Stripe processes payment data as an independent controller.",
        href: "https://stripe.com/es/privacy",
      },
      {
        name: "Mapbox (interactive wine map):",
        text: "Only if you accept the optional map cookie.",
        href: "https://www.mapbox.com/legal/privacy",
      },
    ],
  },
  contact: {
    heading: "8. Contact",
    intro: "For any questions about privacy or data protection, you can contact:",
  },
};

const fr: TextosPrivacidad = {
  seoTitle: "Politique de confidentialité | Restaurant Casa Tomás",
  seoDescription:
    "Informations sur le traitement des données personnelles au restaurant Casa Tomás (Crevillent, Alicante) conformément au RGPD.",
  back: "Retour à l'accueil",
  title: "Politique de confidentialité",
  updated: "Dernière mise à jour : novembre 2026",
  controller: {
    heading: "1. Responsable du traitement",
    companyLabel: "Raison sociale :",
    tradeNameLabel: "Nom commercial :",
    taxIdLabel: "N° d'identification fiscale (CIF) :",
    addressLabel: "Adresse :",
    phoneLabel: "Téléphone :",
    emailLabel: "E-mail :",
  },
  data: {
    heading: "2. Données que nous collectons",
    intro:
      "Nous ne collectons que les données nécessaires à chaque service que vous utilisez. Nos services ne s'adressent pas aux mineurs de moins de 14 ans.",
    items: [
      "Réservations : nom et prénom, téléphone, e-mail (facultatif), date, heure et nombre de convives, ainsi que les demandes particulières que vous nous indiquez.",
      "Newsletter : votre nom et votre e-mail, votre consentement, la date à laquelle vous l'avez donné et la date à laquelle vous avez confirmé votre e-mail.",
      "Chèques-cadeaux : nom, e-mail et téléphone (facultatif) de l'acheteur ; nom du bénéficiaire et dédicace (facultatifs) ; et, si vous demandez une facture, nom ou raison sociale, numéro fiscal et adresse. Le paiement est traité par Stripe : nous ne voyons ni ne conservons les données de votre carte.",
      "Assistant du site (chat) : les messages que vous écrivez. N'indiquez pas de données de santé ni d'autres données sensibles dans le chat ; pour les allergies, adressez-vous au personnel.",
      "« Votez pour votre vin préféré » : nom, e-mail ou téléphone et le vin choisi.",
      "Navigation : statistiques de visites anonymes et agrégées, sans cookies, et journaux techniques du serveur (adresse IP, date et page visitée) pour la sécurité. Si vous acceptez « Statistiques d'utilisation », également les pages que vous consultez et les actions que vous effectuez sur le site (boutons, plats ou vins ouverts, étapes des formulaires), reliées par un identifiant aléatoire, jamais votre nom ni ce que vous saisissez dans les formulaires. Et toujours, les erreurs techniques du site, sans données personnelles.",
    ],
    assistantLabel: "Assistant téléphonique :",
    assistant:
      "Lorsque vous appelez notre numéro, votre appel peut être pris en charge par un assistant vocal automatisé. Dans ce cas, le numéro de téléphone depuis lequel vous appelez est enregistré automatiquement afin de l'associer à votre réservation. L'appel peut être enregistré pour des raisons de qualité et de sécurité ; le cas échéant, nous vous en informerons au début de l'appel.",
  },
  purposes: {
    heading: "3. Finalités et base juridique",
    items: [
      {
        purpose: "Gestion des réservations",
        basis: "Exécution d'un contrat (Art. 6.1.b RGPD)",
        description: "Création, consultation, modification et annulation des réservations au restaurant.",
      },
      {
        purpose: "Communications liées à la réservation",
        basis: "Intérêt légitime (Art. 6.1.f RGPD)",
        description: "Confirmation, rappels ou annulations de votre réservation par téléphone ou par e-mail.",
      },
      {
        purpose: "Sécurité et prévention des abus",
        basis: "Intérêt légitime (Art. 6.1.f RGPD)",
        description:
          "Enregistrement des appels, limites d'utilisation des formulaires et liste d'exclusion afin de prévenir l'usage abusif du système de réservation.",
      },
      {
        purpose: "Newsletter (nouveautés et offres)",
        basis: "Consentement (Art. 6.1.a RGPD)",
        description:
          "Envoi occasionnel de nouveautés, d'événements, de menus spéciaux et d'offres de Casa Tomás à votre e-mail, à partir du nom et de l'e-mail de la réservation. Uniquement si vous cochez la case spécifique de la newsletter lors de la réservation : elle est indépendante de l'acceptation des conditions de réservation, n'est pas cochée par défaut et n'est pas nécessaire pour réserver. Cocher la case ne vous inscrit pas encore : nous ne vous inscrivons que lorsque vous confirmez votre réservation depuis le lien de l'e-mail que nous vous envoyons (double vérification), ce qui prouve que l'e-mail vous appartient ; si la réservation est confirmée par une autre voie (par exemple, par téléphone) ou est annulée avant, nous ne vous inscrivons pas. Vous pouvez retirer votre consentement et vous désinscrire à tout moment, gratuitement, depuis le lien inclus dans chaque e-mail ; la désinscription est immédiate.",
        conditionsLink: true,
      },
      {
        purpose: "Vente de chèques-cadeaux",
        basis: "Exécution d'un contrat (Art. 6.1.b RGPD)",
        description: "Encaisser le chèque, vous l'envoyer par e-mail avec son code et le vérifier lorsqu'il est utilisé au restaurant.",
      },
      {
        purpose: "Facturation et comptabilité",
        basis: "Obligation légale (Art. 6.1.c RGPD)",
        description: "Émettre la facture si vous la demandez et conserver les justificatifs de vente exigés par la réglementation fiscale et commerciale.",
      },
      {
        purpose: "Assistant du site (chat)",
        basis: "Mesures précontractuelles à votre demande (Art. 6.1.b RGPD)",
        description:
          "Répondre à vos questions sur la carte, les horaires ou les réservations. Les réponses sont générées automatiquement et aucune décision vous concernant n'est prise sur leur base.",
      },
      {
        purpose: "Vote du vin préféré et tirage au sort",
        basis: "Consentement (Art. 6.1.a RGPD)",
        description: "Compter les votes, effectuer le tirage au sort entre les participants et prévenir le gagnant. Un vote par e-mail ou téléphone.",
      },
      {
        purpose: "Statistiques d'utilisation du site",
        basis: "Intérêt légitime (Art. 6.1.f RGPD)",
        description: "Savoir combien de visites reçoit chaque page, de manière anonyme et agrégée, afin d'améliorer le site.",
      },
      {
        purpose: "Statistiques d'utilisation propres (parcours)",
        basis: "Consentement (Art. 6.1.a RGPD)",
        description: "Uniquement si vous acceptez « Statistiques d'utilisation » : savoir quelles pages et quels boutons sont utilisés pendant une visite, ce qui est consulté sur la carte et où une réservation ou un achat est abandonné, afin d'améliorer le site. Vous pouvez retirer votre consentement à tout moment depuis « Paramétrer les cookies ».",
      },
      {
        purpose: "Détection des erreurs du site",
        basis: "Intérêt légitime (Art. 6.1.f RGPD)",
        description: "Enregistrer les défaillances techniques du site (sans données personnelles ni identifiants) afin de les corriger.",
      },
    ],
    conditionsLinkText: "Voir les conditions de la newsletter",
  },
  retention: {
    heading: "4. Durées de conservation",
    items: [
      {
        label: "Réservations :",
        text: "Les données de réservation sont conservées pendant la durée de validité de la réservation et, une fois celle-ci terminée, pendant **2 ans** au maximum afin de traiter d'éventuelles réclamations.",
      },
      {
        label: "Journaux d'appels :",
        text: "Les enregistrements générés par l'assistant téléphonique (numéro appelant, durée, résumé) sont supprimés automatiquement au bout de **3 mois**.",
      },
      {
        label: "Conversations du chat :",
        text: "Elles sont conservées **12 mois** au maximum pour traiter les demandes et améliorer les réponses ; elles sont ensuite supprimées.",
      },
      {
        label: "Chèques-cadeaux et factures :",
        text: "Pendant la validité du chèque puis pendant **6 ans**, durée exigée par la réglementation commerciale et fiscale pour les justificatifs de vente.",
      },
      {
        label: "Vote du vin préféré :",
        text: "Jusqu'à la tenue du tirage au sort et à la notification du gagnant ; toutes les participations sont ensuite supprimées.",
      },
      {
        label: "Newsletter :",
        text: "Tant que vous ne retirez pas votre consentement. Lorsque vous vous désinscrivez, nous cessons immédiatement de vous envoyer la newsletter ; nous pouvons conserver la preuve de votre consentement, de la confirmation de votre e-mail et de votre désinscription le temps nécessaire pour les justifier en cas de réclamation.",
      },
      {
        label: "Statistiques et erreurs du site :",
        text: "Nos statistiques d'utilisation sont supprimées au bout de **90 jours** et les erreurs techniques au bout de **180 jours**.",
      },
      {
        label: "Cookies :",
        text: "Consultez la section sur les cookies pour les durées propres à chaque cookie.",
      },
    ],
  },
  cookies: {
    heading: "5. Cookies",
    intro:
      "Nous utilisons nos propres cookies et notre stockage local, nécessaires au fonctionnement du site ou pour mémoriser vos choix, ainsi que deux cookies facultatifs (nos statistiques d'utilisation et la carte tierce) qui ne sont activés que si vous les acceptez dans l'avis sur les cookies ou dans « Paramétrer les cookies » (pied de page). Les statistiques de visites de Vercel n'utilisent pas de cookies.",
    items: [
      {
        name: "cookie_consent / cookieConsent",
        type: "Propre · Nécessaire",
        duration: "1 an",
        purpose: "Enregistre votre choix concernant les cookies pour ne pas vous le redemander à chaque visite.",
      },
      {
        name: "language",
        type: "Propre · Nécessaire",
        duration: "Sans expiration (jusqu'à ce que vous effaciez les données du navigateur)",
        purpose: "Mémorise la langue choisie (espagnol, anglais ou français).",
      },
      {
        name: "edad_vinos_confirmada",
        type: "Propre · Nécessaire",
        duration: "Session du navigateur",
        purpose: "Mémorise que vous avez confirmé être majeur pour consulter la carte des vins, pendant la durée de la visite.",
      },
      {
        name: "user_session_id, pedidos, mi_mesa",
        type: "Propre · Nécessaire",
        duration: "Session du navigateur",
        purpose:
          "Conservent votre commande et les réglages de « Ma table » pendant que vous les préparez, sans les envoyer à nos serveurs tant que vous ne les partagez pas.",
      },
      {
        name: "ct_voto_vino_favorito",
        type: "Propre · Nécessaire",
        duration: "Sans expiration (jusqu'à ce que vous effaciez les données du navigateur)",
        purpose: "Mémorise que vous avez déjà voté pour votre vin préféré afin de ne pas vous le redemander.",
      },
      {
        name: "Stripe (checkout.stripe.com)",
        type: "Tiers · Nécessaire au paiement",
        duration: "Selon la politique de Stripe",
        purpose:
          "Uniquement sur la page de paiement de Stripe lors de l'achat d'un chèque-cadeau : prévention de la fraude et fonctionnement du paiement.",
      },
      {
        name: "ct_actividad",
        type: "Propre · Facultatif, nécessite votre consentement",
        duration: "6 mois",
        purpose:
          "Nos statistiques d'utilisation : un identifiant aléatoire du navigateur et de la visite (30 minutes sans activité en ouvrent une autre) pour relier les pages et actions d'une même visite. Il ne contient aucune donnée personnelle et n'est pas partagé avec des tiers. Sans votre consentement, il n'est pas créé.",
      },
      {
        name: "ct_interno",
        type: "Propre · Nécessaire",
        duration: "Sans expiration (jusqu'à ce que vous effaciez les données du navigateur)",
        purpose: "Uniquement sur les appareils du personnel du restaurant : marque leurs visites pour les exclure des statistiques.",
      },
      {
        name: "Mapbox (mapbox.com, events.mapbox.com)",
        type: "Tiers · Facultatif, nécessite votre consentement",
        duration: "Selon la politique de Mapbox",
        purpose:
          "Charge la carte interactive de la carte des vins et envoie des données d'utilisation anonymes à Mapbox. Sans votre consentement, la carte ne se charge pas.",
      },
    ],
    outro:
      "Vous pouvez modifier votre choix concernant les statistiques d'utilisation et le cookie de Mapbox à tout moment depuis « Paramétrer les cookies », en bas de chaque page, ou en supprimant les cookies de ce site dans les réglages de votre navigateur. Si votre navigateur envoie le signal Global Privacy Control, nous n'activons pas les statistiques d'utilisation.",
  },
  rights: {
    heading: "6. Vos droits",
    intro:
      "Conformément au RGPD et à la loi organique espagnole 3/2018 (LOPD-GDD), vous pouvez exercer les droits suivants :",
    items: [
      { right: "Accès", description: "Savoir quelles données nous détenons à votre sujet." },
      { right: "Rectification", description: "Corriger des données inexactes ou incomplètes." },
      { right: "Effacement", description: "Demander la suppression de vos données personnelles." },
      { right: "Opposition", description: "Vous opposer à certains traitements fondés sur l'intérêt légitime." },
      { right: "Portabilité", description: "Recevoir vos données dans un format structuré et lisible." },
      { right: "Limitation", description: "Demander que nous suspendions le traitement dans certains cas." },
      { right: "Retrait du consentement", description: "Pour la newsletter et le vote, à tout moment et sans effet sur ce qui précède." },
    ],
    exercise:
      "Pour exercer l'un de ces droits, contactez-nous à {email} en indiquant votre nom et le droit que vous souhaitez exercer, et en joignant une copie de votre pièce d'identité ou d'un document équivalent.",
    complaint:
      "Si vous estimez que le traitement n'est pas conforme à la réglementation, vous pouvez introduire une réclamation auprès de l'[Agence espagnole de protection des données (AEPD)](https://www.aepd.es).",
  },
  providers: {
    heading: "7. Prestataires de services et transferts",
    intro:
      "Pour fournir le service, nous faisons appel aux prestataires suivants, qui traitent les données pour notre compte dans le cadre d'un contrat de sous-traitance. Certains sont situés aux États-Unis : le transfert est couvert par le cadre de protection des données UE-États-Unis ou par les clauses contractuelles types de la Commission européenne.",
    privacyLinkLabel: "Politique de confidentialité",
    items: [
      {
        name: "Supabase (base de données) :",
        text: "Stockage des réservations, des chèques-cadeaux, des conversations du chat, des votes et des statistiques d'utilisation et erreurs du site. Serveurs dans l'Union européenne (Irlande).",
        href: "https://supabase.com/privacy",
      },
      {
        name: "Vapi (assistant vocal IA) :",
        text: "Traitement des appels téléphoniques. États-Unis.",
        href: "https://vapi.ai/privacy",
      },
      {
        name: "OpenAI (modèle de langage) :",
        text: "Interprétation des appels et réponses de l'assistant du site (chat). États-Unis.",
        href: "https://openai.com/policies/privacy-policy",
      },
      {
        name: "Vercel (hébergement web) :",
        text: "Infrastructure du site et statistiques de visites anonymes. États-Unis.",
        href: "https://vercel.com/legal/privacy-policy",
      },
      {
        name: "Resend (envoi d'e-mails) :",
        text: "Envoi des e-mails de réservation, des chèques-cadeaux et, si vous y êtes abonné, de la newsletter. États-Unis.",
        href: "https://resend.com/legal/privacy-policy",
      },
      {
        name: "Stripe (paiements) :",
        text: "Paiement par carte des chèques-cadeaux. Stripe traite les données de paiement en tant que responsable indépendant.",
        href: "https://stripe.com/es/privacy",
      },
      {
        name: "Mapbox (carte interactive des vins) :",
        text: "Uniquement si vous acceptez le cookie facultatif de la carte.",
        href: "https://www.mapbox.com/legal/privacy",
      },
    ],
  },
  contact: {
    heading: "8. Contact",
    intro: "Pour toute question relative à la confidentialité ou à la protection des données, vous pouvez vous adresser à :",
  },
};

export const TEXTOS_PRIVACIDAD: Record<Language, TextosPrivacidad> = { es, en, fr };
