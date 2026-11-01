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
 * cifras (2 años, 3 meses), mismas bases legales y mismos datos del
 * responsable. Si se cambia el español, hay que cambiar los otros dos (un test
 * comprueba que los tres tienen la misma estructura y las mismas cifras).
 *
 * Los párrafos admiten un marcado mínimo (`renderTextoRico` en la página):
 * `**negrita**`, `[texto](https://enlace)`, `{phone}` y `{email}`.
 */
import type { Language } from "../i18n/types";

export interface TextosPrivacidad {
  seoTitle: string;
  seoDescription: string;
  back: string;
  title: string;
  updated: string;
  controller: {
    heading: string;
    companyLabel: string;
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

/** Datos del responsable: iguales en los tres idiomas (no se traducen). */
export const RESPONSABLE_TRATAMIENTO = {
  razonSocial: "Restaurante Casa Tomás",
  direccion: "Carrer Santa Maria de la Cabeza, 2 — 03330 Crevillent (Alicante)",
} as const;

const es: TextosPrivacidad = {
  seoTitle: "Política de Privacidad | Casa Tomás Restaurante",
  seoDescription:
    "Información sobre el tratamiento de datos personales en Casa Tomás Restaurante (Crevillent, Alicante) conforme al RGPD.",
  back: "Volver al inicio",
  title: "Política de Privacidad",
  updated: "Última actualización: octubre de 2026",
  controller: {
    heading: "1. Responsable del tratamiento",
    companyLabel: "Razón social:",
    addressLabel: "Dirección:",
    phoneLabel: "Teléfono:",
    emailLabel: "Email:",
  },
  data: {
    heading: "2. Datos que recogemos",
    intro:
      "Recogemos únicamente los datos estrictamente necesarios para gestionar su reserva y prestarle el servicio:",
    items: [
      "Nombre y apellidos",
      "Número de teléfono de contacto",
      "Dirección de correo electrónico (opcional)",
      "Fecha, hora y número de comensales de la reserva",
      "Peticiones especiales o notas adicionales (si las indica)",
      "Si se suscribe a la newsletter: su consentimiento, la fecha en que lo dio y la fecha en que confirmó su email",
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
          "Registro de llamadas y gestión de una lista de exclusión para prevenir el uso indebido del sistema de reservas.",
      },
      {
        purpose: "Newsletter (novedades y ofertas)",
        basis: "Consentimiento (Art. 6.1.a RGPD)",
        description:
          "Envío ocasional de novedades, eventos, menús especiales y ofertas de Casa Tomás a su email, usando el nombre y el email de la reserva. Solo si marca la casilla específica de la newsletter al reservar: es independiente de la aceptación de las condiciones de reserva, está desmarcada por defecto y no es necesaria para reservar. Marcar la casilla no le suscribe todavía: le damos de alta solo cuando confirma su reserva desde el enlace del email que le enviamos (doble verificación), lo que acredita que el email es suyo; si la reserva se confirma por otra vía (por ejemplo, por teléfono) o se cancela antes, no le suscribimos. Puede retirar su consentimiento y darse de baja en cualquier momento, sin coste, desde el enlace incluido en cada email; la baja es inmediata.",
        conditionsLink: true,
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
        label: "Newsletter:",
        text: "Mientras no retire su consentimiento. Al darse de baja dejamos de enviarle la newsletter de inmediato; podemos conservar la constancia de su consentimiento, de la confirmación de su email y de su baja durante el tiempo necesario para acreditarlos ante posibles reclamaciones.",
      },
      {
        label: "Cookies:",
        text: "Consulte nuestra política de cookies para los plazos específicos de cada cookie.",
      },
    ],
  },
  cookies: {
    heading: "5. Cookies",
    intro:
      'Usamos cookies y almacenamiento local propios, todos necesarios para que la web funcione, y una cookie de terceros que solo se activa si la acepta en el aviso de cookies o en "Configurar cookies" (pie de página).',
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
        name: "Mapbox (mapbox.com, events.mapbox.com)",
        type: "Tercero · Opcional, requiere su consentimiento",
        duration: "Según la política de Mapbox",
        purpose:
          "Carga el mapa interactivo de la carta de vinos y envía datos de uso anónimos a Mapbox. Sin su consentimiento, el mapa no se carga.",
      },
    ],
    outro:
      'Puede cambiar su elección sobre la cookie opcional de Mapbox en cualquier momento desde "Configurar cookies", al pie de cualquier página, o borrando las cookies de este sitio desde los ajustes de su navegador.',
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
    ],
    exercise:
      "Para ejercer cualquiera de estos derechos, contacte con nosotros en {email} indicando su nombre, el derecho que desea ejercer y adjuntando una copia de su DNI o documento equivalente.",
    complaint:
      "Si considera que el tratamiento no es conforme a la normativa, puede presentar una reclamación ante la [Agencia Española de Protección de Datos (AEPD)](https://www.aepd.es).",
  },
  providers: {
    heading: "7. Proveedores de servicio y transferencias",
    intro:
      "Para prestar el servicio utilizamos los siguientes proveedores, que actúan como encargados del tratamiento y que cuentan con garantías adecuadas de protección de datos:",
    privacyLinkLabel: "Política de privacidad",
    items: [
      {
        name: "Supabase (base de datos):",
        text: "Almacenamiento de reservas. Datos en la Unión Europea.",
        href: "https://supabase.com/privacy",
      },
      {
        name: "Vapi (asistente de voz IA):",
        text: "Procesamiento de llamadas telefónicas.",
        href: "https://vapi.ai/privacy",
      },
      {
        name: "OpenAI (modelo de lenguaje):",
        text: "Interpretación de las solicitudes verbales del usuario.",
        href: "https://openai.com/policies/privacy-policy",
      },
      {
        name: "Vercel (alojamiento web):",
        text: "Infraestructura de la aplicación.",
        href: "https://vercel.com/legal/privacy-policy",
      },
      {
        name: "Proveedor de envío de correo electrónico:",
        text: "Envío de los emails de la reserva y, si se ha suscrito, de la newsletter. Actúa solo por cuenta de Casa Tomás y siguiendo sus instrucciones.",
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
  updated: "Last updated: October 2026",
  controller: {
    heading: "1. Data controller",
    companyLabel: "Company name:",
    addressLabel: "Address:",
    phoneLabel: "Phone:",
    emailLabel: "Email:",
  },
  data: {
    heading: "2. Data we collect",
    intro:
      "We collect only the data strictly necessary to manage your booking and provide you with the service:",
    items: [
      "First name and surname",
      "Contact telephone number",
      "Email address (optional)",
      "Date, time and number of guests of the booking",
      "Special requests or additional notes (if you provide them)",
      "If you subscribe to the newsletter: your consent, the date you gave it and the date you confirmed your email",
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
          "Call logging and management of an exclusion list to prevent misuse of the booking system.",
      },
      {
        purpose: "Newsletter (news and offers)",
        basis: "Consent (Art. 6.1.a GDPR)",
        description:
          "Occasional sending of news, events, special menus and offers from Casa Tomás to your email, using the name and email from the booking. Only if you tick the specific newsletter checkbox when booking: it is independent of the acceptance of the booking conditions, is unticked by default and is not necessary in order to book. Ticking the checkbox does not subscribe you yet: we only sign you up when you confirm your booking from the link in the email we send you (double verification), which proves that the email is yours; if the booking is confirmed by another route (for example, by phone) or is cancelled beforehand, we do not subscribe you. You may withdraw your consent and unsubscribe at any time, free of charge, from the link included in every email; unsubscribing takes effect immediately.",
        conditionsLink: true,
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
        label: "Newsletter:",
        text: "For as long as you do not withdraw your consent. When you unsubscribe we stop sending you the newsletter immediately; we may keep the record of your consent, of the confirmation of your email and of your unsubscription for as long as necessary to prove them in the event of claims.",
      },
      {
        label: "Cookies:",
        text: "See our cookie policy for the specific periods of each cookie.",
      },
    ],
  },
  cookies: {
    heading: "5. Cookies",
    intro:
      'We use our own cookies and local storage, all of them necessary for the website to work, and one third-party cookie that is only activated if you accept it in the cookie notice or in "Cookie settings" (footer).',
    items: [
      {
        name: "cookie_consent / cookieConsent",
        type: "First-party · Necessary",
        duration: "1 year",
        purpose: "Stores your choice about cookies so that we do not ask you again on every visit.",
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
        purpose: "Remembers that you confirmed you are of legal age to view the wine list, for the duration of the visit.",
      },
      {
        name: "user_session_id, pedidos, mi_mesa",
        type: "First-party · Necessary",
        duration: "Browser session",
        purpose:
          'Store your order and your "My table" settings while you are preparing it, without sending it to our servers until you share it.',
      },
      {
        name: "Mapbox (mapbox.com, events.mapbox.com)",
        type: "Third-party · Optional, requires your consent",
        duration: "According to Mapbox's policy",
        purpose:
          "Loads the interactive map of the wine list and sends anonymous usage data to Mapbox. Without your consent, the map is not loaded.",
      },
    ],
    outro:
      'You can change your choice about the optional Mapbox cookie at any time from "Cookie settings", at the bottom of any page, or by deleting this site\'s cookies from your browser settings.',
  },
  rights: {
    heading: "6. Your rights",
    intro:
      "In accordance with the GDPR and Organic Law 3/2018 (LOPD-GDD), you may exercise the following rights:",
    items: [
      { right: "Access", description: "Find out what data we hold about you." },
      { right: "Rectification", description: "Correct inaccurate or incomplete data." },
      { right: "Erasure", description: "Request the deletion of your personal data." },
      { right: "Objection", description: "Object to certain processing based on legitimate interest." },
      { right: "Portability", description: "Receive your data in a structured and readable format." },
      { right: "Restriction", description: "Ask us to suspend the processing in certain cases." },
    ],
    exercise:
      "To exercise any of these rights, contact us at {email} stating your name and the right you wish to exercise, and attaching a copy of your ID card (DNI) or equivalent document.",
    complaint:
      "If you consider that the processing does not comply with the regulations, you may lodge a complaint with the [Spanish Data Protection Agency (AEPD)](https://www.aepd.es).",
  },
  providers: {
    heading: "7. Service providers and transfers",
    intro:
      "To provide the service we use the following providers, who act as data processors and have adequate data protection safeguards:",
    privacyLinkLabel: "Privacy policy",
    items: [
      {
        name: "Supabase (database):",
        text: "Storage of bookings. Data in the European Union.",
        href: "https://supabase.com/privacy",
      },
      {
        name: "Vapi (AI voice assistant):",
        text: "Processing of phone calls.",
        href: "https://vapi.ai/privacy",
      },
      {
        name: "OpenAI (language model):",
        text: "Interpretation of the user's spoken requests.",
        href: "https://openai.com/policies/privacy-policy",
      },
      {
        name: "Vercel (web hosting):",
        text: "Application infrastructure.",
        href: "https://vercel.com/legal/privacy-policy",
      },
      {
        name: "Email delivery provider:",
        text: "Sending of the booking emails and, if you have subscribed, of the newsletter. It acts solely on behalf of Casa Tomás and following its instructions.",
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
    intro: "For any query about privacy or data protection, you can contact:",
  },
};

const fr: TextosPrivacidad = {
  seoTitle: "Politique de confidentialité | Restaurant Casa Tomás",
  seoDescription:
    "Informations sur le traitement des données personnelles au restaurant Casa Tomás (Crevillent, Alicante) conformément au RGPD.",
  back: "Retour à l'accueil",
  title: "Politique de confidentialité",
  updated: "Dernière mise à jour : octobre 2026",
  controller: {
    heading: "1. Responsable du traitement",
    companyLabel: "Raison sociale :",
    addressLabel: "Adresse :",
    phoneLabel: "Téléphone :",
    emailLabel: "E-mail :",
  },
  data: {
    heading: "2. Données que nous collectons",
    intro:
      "Nous collectons uniquement les données strictement nécessaires pour gérer votre réservation et vous fournir le service :",
    items: [
      "Nom et prénom",
      "Numéro de téléphone de contact",
      "Adresse e-mail (facultative)",
      "Date, heure et nombre de convives de la réservation",
      "Demandes particulières ou notes supplémentaires (si vous en indiquez)",
      "Si vous vous abonnez à la newsletter : votre consentement, la date à laquelle vous l'avez donné et la date à laquelle vous avez confirmé votre e-mail",
    ],
    assistantLabel: "Assistant téléphonique :",
    assistant:
      "Lorsque vous appelez notre numéro, votre appel peut être pris en charge par un assistant vocal automatisé. Dans ce cas, le numéro de téléphone depuis lequel vous appelez est enregistré automatiquement afin de le rattacher à votre réservation. L'appel peut être enregistré pour des raisons de qualité et de sécurité ; le cas échéant, nous vous en informerons au début de l'appel.",
  },
  purposes: {
    heading: "3. Finalités et base juridique",
    items: [
      {
        purpose: "Gestion des réservations",
        basis: "Exécution d'un contrat (art. 6.1.b RGPD)",
        description: "Création, consultation, modification et annulation des réservations au restaurant.",
      },
      {
        purpose: "Communications liées à la réservation",
        basis: "Intérêt légitime (art. 6.1.f RGPD)",
        description: "Confirmation, rappels ou annulations de votre réservation par téléphone ou par e-mail.",
      },
      {
        purpose: "Sécurité et prévention des abus",
        basis: "Intérêt légitime (art. 6.1.f RGPD)",
        description:
          "Enregistrement des appels et gestion d'une liste d'exclusion afin de prévenir l'utilisation abusive du système de réservation.",
      },
      {
        purpose: "Newsletter (actualités et offres)",
        basis: "Consentement (art. 6.1.a RGPD)",
        description:
          "Envoi occasionnel d'actualités, d'événements, de menus spéciaux et d'offres de Casa Tomás à votre adresse e-mail, à partir du nom et de l'e-mail de la réservation. Uniquement si vous cochez la case spécifique de la newsletter lors de la réservation : elle est indépendante de l'acceptation des conditions de réservation, elle est décochée par défaut et elle n'est pas nécessaire pour réserver. Cocher la case ne vous abonne pas encore : nous ne vous inscrivons que lorsque vous confirmez votre réservation depuis le lien de l'e-mail que nous vous envoyons (double vérification), ce qui prouve que l'adresse e-mail est bien la vôtre ; si la réservation est confirmée par un autre moyen (par exemple par téléphone) ou annulée auparavant, nous ne vous inscrivons pas. Vous pouvez retirer votre consentement et vous désabonner à tout moment, sans frais, depuis le lien inclus dans chaque e-mail ; le désabonnement est immédiat.",
        conditionsLink: true,
      },
    ],
    conditionsLinkText: "Voir les conditions de la newsletter",
  },
  retention: {
    heading: "4. Durées de conservation",
    items: [
      {
        label: "Réservations :",
        text: "Les données des réservations sont conservées pendant la durée de validité de la réservation puis, une fois celle-ci terminée, pendant un maximum de **2 ans** afin de traiter d'éventuelles réclamations.",
      },
      {
        label: "Journaux d'appels :",
        text: "Les enregistrements générés par l'assistant téléphonique (numéro appelant, durée, résumé) sont supprimés automatiquement au bout de **3 mois**.",
      },
      {
        label: "Newsletter :",
        text: "Tant que vous ne retirez pas votre consentement. Lorsque vous vous désabonnez, nous cessons immédiatement de vous envoyer la newsletter ; nous pouvons conserver la preuve de votre consentement, de la confirmation de votre e-mail et de votre désabonnement pendant le temps nécessaire pour les justifier en cas de réclamation.",
      },
      {
        label: "Cookies :",
        text: "Consultez notre politique de cookies pour connaître les durées propres à chaque cookie.",
      },
    ],
  },
  cookies: {
    heading: "5. Cookies",
    intro:
      "Nous utilisons des cookies et un stockage local propres, tous nécessaires au fonctionnement du site, et un cookie tiers qui ne s'active que si vous l'acceptez dans l'avis sur les cookies ou dans « Configurer les cookies » (pied de page).",
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
          "Conservent la commande et les réglages de « Ma table » pendant que vous la préparez, sans l'envoyer à nos serveurs tant que vous ne la partagez pas.",
      },
      {
        name: "Mapbox (mapbox.com, events.mapbox.com)",
        type: "Tiers · Facultatif, nécessite votre consentement",
        duration: "Selon la politique de Mapbox",
        purpose:
          "Charge la carte interactive de la carte des vins et envoie des données d'usage anonymes à Mapbox. Sans votre consentement, la carte n'est pas chargée.",
      },
    ],
    outro:
      "Vous pouvez modifier votre choix concernant le cookie facultatif de Mapbox à tout moment depuis « Configurer les cookies », en bas de n'importe quelle page, ou en supprimant les cookies de ce site depuis les paramètres de votre navigateur.",
  },
  rights: {
    heading: "6. Vos droits",
    intro:
      "Conformément au RGPD et à la loi organique 3/2018 (LOPD-GDD), vous pouvez exercer les droits suivants :",
    items: [
      { right: "Accès", description: "Savoir quelles données nous détenons sur vous." },
      { right: "Rectification", description: "Corriger des données inexactes ou incomplètes." },
      { right: "Effacement", description: "Demander la suppression de vos données personnelles." },
      { right: "Opposition", description: "S'opposer à certains traitements fondés sur l'intérêt légitime." },
      { right: "Portabilité", description: "Recevoir vos données dans un format structuré et lisible." },
      { right: "Limitation", description: "Demander que nous suspendions le traitement dans certains cas." },
    ],
    exercise:
      "Pour exercer l'un de ces droits, contactez-nous à l'adresse {email} en indiquant votre nom et le droit que vous souhaitez exercer, et en joignant une copie de votre DNI ou d'un document équivalent.",
    complaint:
      "Si vous estimez que le traitement n'est pas conforme à la réglementation, vous pouvez déposer une réclamation auprès de l'[Agence espagnole de protection des données (AEPD)](https://www.aepd.es).",
  },
  providers: {
    heading: "7. Prestataires de services et transferts",
    intro:
      "Pour fournir le service, nous utilisons les prestataires suivants, qui agissent en tant que sous-traitants et offrent des garanties appropriées de protection des données :",
    privacyLinkLabel: "Politique de confidentialité",
    items: [
      {
        name: "Supabase (base de données) :",
        text: "Stockage des réservations. Données dans l'Union européenne.",
        href: "https://supabase.com/privacy",
      },
      {
        name: "Vapi (assistant vocal IA) :",
        text: "Traitement des appels téléphoniques.",
        href: "https://vapi.ai/privacy",
      },
      {
        name: "OpenAI (modèle de langage) :",
        text: "Interprétation des demandes orales de l'utilisateur.",
        href: "https://openai.com/policies/privacy-policy",
      },
      {
        name: "Vercel (hébergement web) :",
        text: "Infrastructure de l'application.",
        href: "https://vercel.com/legal/privacy-policy",
      },
      {
        name: "Prestataire d'envoi d'e-mails :",
        text: "Envoi des e-mails de la réservation et, si vous vous êtes abonné, de la newsletter. Il agit uniquement pour le compte de Casa Tomás et selon ses instructions.",
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
