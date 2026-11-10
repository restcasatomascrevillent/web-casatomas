/**
 * Condiciones de compra de los cheques regalo y bases del sorteo «Vota tu vino
 * favorito», en los tres idiomas. Las pinta `pages/Condiciones.tsx` debajo de
 * las de reserva y newsletter (anclas `#cheques-regalo` y `#sorteo`).
 *
 * Viven aquí y no en `src/i18n/languages/*.ts` por lo mismo que la política de
 * privacidad: los diccionarios van en el bundle de arranque y esto es texto
 * largo que solo necesita una ruta perezosa.
 *
 * Decisiones del dueño (09/11/2026) que recogen:
 *  · desistimiento de 30 días (la ley pide 14) si el cheque no se ha usado,
 *    pedido por email o en el restaurante, con devolución de todo lo pagado
 *    (gastos de gestión incluidos: art. 107.1 TRLGDCU) en 14 días;
 *  · el cheque vale solo para comer y beber en el restaurante (no en la tienda
 *    de vinos ni en Touza) y caduca a los 12 meses, ampliable si se pide;
 *  · el saldo sobrante lo decide el restaurante en cada caso: por eso aquí
 *    solo se dice que la diferencia no se devuelve en efectivo;
 *  · si se pierde el código, se reenvía al email de la compra;
 *  · las bases del sorteo no fijan premio ni fechas: los pone el panel en
 *    `configuracion_web` y la página los enseña en «Edición actual».
 *
 * El español es el texto de referencia; inglés y francés, su traducción
 * apartado por apartado (un test comprueba estructura y cifras). Marcado de
 * los párrafos: `{phone}`, `{email}` y `{privacy}` (ver `Condiciones.tsx`).
 */
import type { Language } from "../i18n/types";
import { TITULAR } from "./titular";

export type SeccionCondiciones = { readonly title: string; readonly paragraphs: readonly string[] };

export interface TextosChequesSorteo {
  tocGift: string;
  giftHeading: string;
  giftIntro: string;
  giftSections: readonly SeccionCondiciones[];
  tocDraw: string;
  drawHeading: string;
  drawIntro: string;
  drawSections: readonly SeccionCondiciones[];
  drawCurrent: {
    title: string;
    prize: string;
    lastDay: string;
    included: string;
    none: string;
  };
}

const { denominacionSocial: SOCIEDAD, nombreComercial: COMERCIAL, cif: CIF, domicilio: DOMICILIO } = TITULAR;

const es: TextosChequesSorteo = {
  tocGift: "Condiciones de compra de cheques regalo",
  giftHeading: "Condiciones de compra de cheques regalo",
  giftIntro:
    "Se aplican a los cheques regalo que se compran en esta web. Puedes leerlas antes de pagar; al pagar declaras haberlas leído y aceptado.",
  giftSections: [
    {
      title: "1. Quién los vende",
      paragraphs: [
        `Los vende ${SOCIEDAD} (${COMERCIAL}), con CIF ${CIF} y domicilio en ${DOMICILIO}. Puedes contactar con nosotros en el {phone} o en {email}.`,
      ],
    },
    {
      title: "2. Qué es y dónde se usa",
      paragraphs: [
        "El cheque regalo es un vale por el importe que eliges, para gastarlo en comidas y bebidas consumidas en el restaurante Casa Tomás. No sirve para comprar botellas de la tienda de vinos ni en otros establecimientos, y no se puede cambiar por dinero en efectivo. Si la cuenta es menor que el valor del cheque, la diferencia no se devuelve en efectivo.",
        "Lo puede usar cualquier persona que presente su código, así que puedes regalarlo. Guárdalo como si fuera dinero y compártelo solo con la persona a la que se lo regalas.",
      ],
    },
    {
      title: "3. Precio y pago",
      paragraphs: [
        "El valor del cheque es el importe que eliges. La compra online puede incluir gastos de preparación y emisión por generar el cheque digital y su PDF, tramitar su entrega y mantener la plataforma de emisión. Se aplican por igual con cualquier medio de pago y se muestran desglosados, junto con el precio total, antes de pagar. Los importes incluyen los impuestos aplicables.",
        "El pago se hace en la página de pago seguro de Stripe, con tarjeta o con otro de los medios que ofrezca. No vemos ni guardamos los datos de tu tarjeta.",
      ],
    },
    {
      title: "4. Entrega",
      paragraphs: [
        "Cuando se confirma el pago te enviamos, al email que nos indicas, el código del cheque y el cheque en PDF, listo para imprimir o reenviar. La «fecha deseada de entrega» es orientativa y se imprime en el cheque, pero el email se envía siempre al confirmarse el pago. Si no te llega, revisa la carpeta de spam o escríbenos.",
      ],
    },
    {
      title: "5. Validez",
      paragraphs: [
        "El cheque es válido durante 12 meses desde la fecha de compra; la fecha exacta figura en el email y en el PDF. Si no puedes usarlo a tiempo, pídenos que ampliemos el plazo y lo estudiaremos. Pasada la fecha sin haberlo usado ni ampliado, el cheque deja de ser válido y no se devuelve su importe.",
      ],
    },
    {
      title: "6. Cómo se canjea",
      paragraphs: [
        "Enseña el código, en el móvil o impreso, al pedir la cuenta en el restaurante. Te recomendamos reservar mesa con antelación.",
      ],
    },
    {
      title: "7. Si pierdes el código",
      paragraphs: [
        "Escríbenos o llámanos y te lo volveremos a enviar al email con el que se compró, siempre que el cheque no se haya canjeado.",
      ],
    },
    {
      title: "8. Derecho de desistimiento: 30 días para devolverlo",
      paragraphs: [
        "Tienes 30 días naturales desde la compra (más que los 14 días que fija la ley) para desistir de la compra y recuperar tu dinero, sin tener que dar explicaciones, siempre que el cheque no se haya usado.",
        "Para hacerlo, comunícanoslo antes de que acabe el plazo: por email a {email}, indicando el código del cheque, o en persona en el restaurante. Puedes usar el modelo de formulario del apartado siguiente, aunque no es obligatorio.",
        "Te devolveremos todo lo que pagaste, incluidos los gastos de gestión, en un plazo máximo de 14 días desde que nos lo comuniques, por el mismo medio de pago que usaste y sin ningún coste para ti. Desde ese momento el código queda anulado.",
      ],
    },
    {
      title: "9. Modelo de formulario de desistimiento",
      paragraphs: [
        "(Solo tienes que rellenar y enviar este formulario si quieres desistir del contrato.)",
        `A la atención de ${SOCIEDAD} (${COMERCIAL}), ${DOMICILIO}, email {email}:`,
        "Por la presente le comunico que desisto de mi contrato de compra del siguiente cheque regalo: código ______, comprado el ______.",
        "Nombre del consumidor: ______. Domicilio del consumidor: ______.",
        "Firma del consumidor (solo si el formulario se presenta en papel): ______. Fecha: ______.",
      ],
    },
    {
      title: "10. Factura",
      paragraphs: [
        "Al comprar el cheque no se emite factura. Si la necesitas, pídela al canjearlo: en el restaurante o escribiendo a {email} con el código del cheque y tus datos fiscales (nombre o razón social, NIF y dirección).",
      ],
    },
    {
      title: "11. Reclamaciones, datos y ley aplicable",
      paragraphs: [
        "Para cualquier queja o reclamación, escríbenos a {email} o llámanos al {phone}: te responderemos lo antes posible y, como máximo, en un mes. También puedes pedir una hoja de reclamaciones oficial en el restaurante.",
        "Tratamos los datos de la compra para gestionarla, tal como se explica en nuestra {privacy}. Estas condiciones se rigen por la ley española; si eres consumidor, puedes acudir a los juzgados de tu domicilio.",
      ],
    },
  ],
  tocDraw: "Bases del sorteo «Vota tu vino favorito»",
  drawHeading: "Bases del sorteo «Vota tu vino favorito»",
  drawIntro:
    "Se aplican a cada edición del sorteo entre quienes votan su vino favorito en la carta de vinos de esta web. Participar supone aceptarlas.",
  drawSections: [
    {
      title: "1. Organizador",
      paragraphs: [`Organiza el sorteo ${SOCIEDAD} (${COMERCIAL}), con CIF ${CIF} y domicilio en ${DOMICILIO}.`],
    },
    {
      title: "2. Quién puede participar",
      paragraphs: [
        "Personas mayores de 18 años. No pueden participar las personas que trabajan en Casa Tomás. Participar es gratis y no obliga a comprar nada.",
      ],
    },
    {
      title: "3. Cómo se participa",
      paragraphs: [
        "Mientras la votación está abierta, elige tu vino favorito en la carta de vinos de esta web, escribe tu nombre y un email o teléfono, confirma que eres mayor de 18 años y que aceptas estas bases, y envía tu voto. Solo vale una participación por persona (un mismo email o teléfono cuenta una sola vez). No cuentan las participaciones con datos falsos o hechas de forma automática.",
      ],
    },
    {
      title: "4. Duración y premio",
      paragraphs: [
        "Cada edición empieza cuando el restaurante abre la votación y termina al acabar el último día para votar (hora de España). El premio y ese último día se anuncian en la propia votación y en el recuadro «Edición actual» de esta página, y no cambian mientras la votación está abierta. El premio no se puede cambiar por dinero ni por otro premio.",
      ],
    },
    {
      title: "5. Cómo se elige y se avisa a quien gane",
      paragraphs: [
        "En los 7 días siguientes al cierre, el restaurante elige al azar una participación entre todas las válidas, con un sistema de sorteo aleatorio. Avisamos a quien gane por el email o el teléfono que indicó. Si no responde en 15 días, renuncia al premio o no cumple estas bases, se elige otra participación al azar.",
      ],
    },
    {
      title: "6. Entrega del premio",
      paragraphs: [
        "El premio se recoge o se disfruta en el restaurante Casa Tomás, en la fecha que acordemos con quien gane, dentro de los 3 meses siguientes al aviso. Para recogerlo hay que acreditar la identidad y la mayoría de edad con un documento oficial.",
      ],
    },
    {
      title: "7. Impuestos",
      paragraphs: [
        "Si el valor del premio supera los 300 €, Casa Tomás hará el ingreso a cuenta del IRPF que corresponda y quien gane deberá incluirlo en su declaración, según la normativa fiscal.",
      ],
    },
    {
      title: "8. Datos personales",
      paragraphs: [
        "Usamos tu nombre y tu contacto solo para gestionar el sorteo y avisar a quien gane, y los borramos al terminar cada edición, tal como se explica en nuestra {privacy}.",
      ],
    },
    {
      title: "9. Otras condiciones",
      paragraphs: [
        "Casa Tomás puede cancelar una edición o cambiar sus fechas por causas justificadas, avisándolo en esta página. Estas bases se rigen por la ley española.",
      ],
    },
  ],
  drawCurrent: {
    title: "Edición actual",
    prize: "Premio:",
    lastDay: "Último día para votar:",
    included: "(incluido)",
    none: "Ahora mismo no hay ninguna edición abierta. Cuando se abra, aquí verás el premio y el último día para votar.",
  },
};

const en: TextosChequesSorteo = {
  tocGift: "Gift voucher purchase terms",
  giftHeading: "Gift voucher purchase terms",
  giftIntro:
    "These apply to gift vouchers bought on this website. You can read them before paying; by paying you confirm that you have read and accepted them.",
  giftSections: [
    {
      title: "1. Who sells them",
      paragraphs: [
        `They are sold by ${SOCIEDAD} (${COMERCIAL}), tax ID (CIF) ${CIF}, registered address ${DOMICILIO}. You can contact us on {phone} or at {email}.`,
      ],
    },
    {
      title: "2. What it is and where it can be used",
      paragraphs: [
        "The gift voucher is worth the amount you choose and can be spent on food and drinks consumed at Casa Tomás restaurant. It cannot be used to buy bottles from the wine shop or at other establishments, and it cannot be exchanged for cash. If the bill is lower than the value of the voucher, the difference is not refunded in cash.",
        "Anyone who presents the code can use it, so you can give it as a gift. Keep it as safe as cash and share it only with the person you are giving it to.",
      ],
    },
    {
      title: "3. Price and payment",
      paragraphs: [
        "The gift voucher value is the amount you choose. Online purchases may include preparation and issuance costs for creating the digital voucher and its PDF, arranging digital delivery and maintaining the issuance platform. They apply equally to all payment methods and are itemised with the total before payment. All amounts include applicable taxes.",
        "Payment is made on Stripe's secure payment page, by card or by any other method it offers. We never see or store your card details.",
      ],
    },
    {
      title: "4. Delivery",
      paragraphs: [
        "Once payment is confirmed we send the voucher code and the voucher as a PDF, ready to print or forward, to the email address you give us. The “preferred delivery date” is for reference only and is printed on the voucher, but the email is always sent as soon as payment is confirmed. If it doesn't arrive, check your spam folder or write to us.",
      ],
    },
    {
      title: "5. Validity",
      paragraphs: [
        "The voucher is valid for 12 months from the date of purchase; the exact date appears in the email and on the PDF. If you can't use it in time, ask us to extend it and we will consider it. Once that date has passed without the voucher being used or extended, it is no longer valid and its amount is not refunded.",
      ],
    },
    {
      title: "6. How to redeem it",
      paragraphs: [
        "Show the code, on your phone or printed, when you ask for the bill at the restaurant. We recommend booking a table in advance.",
      ],
    },
    {
      title: "7. If you lose the code",
      paragraphs: [
        "Write to us or call us and we will send it again to the email address used for the purchase, provided the voucher has not been redeemed.",
      ],
    },
    {
      title: "8. Right of withdrawal: 30 days to return it",
      paragraphs: [
        "You have 30 calendar days from the purchase (more than the 14 days required by law) to withdraw from the purchase and get your money back, without giving any reason, provided the voucher has not been used.",
        "To do so, let us know before the period ends: by email to {email}, stating the voucher code, or in person at the restaurant. You can use the model form in the next section, although it is not compulsory.",
        "We will refund everything you paid, including the handling fee, within 14 days at most of you telling us, using the same payment method you used and at no cost to you. From that moment the code is cancelled.",
      ],
    },
    {
      title: "9. Model withdrawal form",
      paragraphs: [
        "(Only fill in and send this form if you wish to withdraw from the contract.)",
        `To ${SOCIEDAD} (${COMERCIAL}), ${DOMICILIO}, email {email}:`,
        "I hereby give notice that I withdraw from my contract for the purchase of the following gift voucher: code ______, purchased on ______.",
        "Name of consumer: ______. Address of consumer: ______.",
        "Signature of consumer (only if this form is submitted on paper): ______. Date: ______.",
      ],
    },
    {
      title: "10. Invoice",
      paragraphs: [
        "No invoice is issued when you buy the voucher. If you need one, ask for it when the voucher is redeemed: at the restaurant or by writing to {email} with the voucher code and your tax details (name or company name, tax ID and address).",
      ],
    },
    {
      title: "11. Complaints, data and governing law",
      paragraphs: [
        "For any complaint, write to us at {email} or call us on {phone}: we will reply as soon as possible and within one month at the latest. You can also ask for an official complaint form at the restaurant.",
        "We process the purchase data in order to manage it, as explained in our {privacy}. These terms are governed by Spanish law; if you are a consumer, you may go to the courts of your place of residence.",
      ],
    },
  ],
  tocDraw: "“Vote for your favourite wine” prize draw rules",
  drawHeading: "“Vote for your favourite wine” prize draw rules",
  drawIntro:
    "These apply to each edition of the prize draw among those who vote for their favourite wine on this website's wine list. Taking part means accepting them.",
  drawSections: [
    {
      title: "1. Organiser",
      paragraphs: [`The prize draw is organised by ${SOCIEDAD} (${COMERCIAL}), tax ID (CIF) ${CIF}, registered address ${DOMICILIO}.`],
    },
    {
      title: "2. Who can take part",
      paragraphs: [
        "People aged 18 or over. People who work at Casa Tomás cannot take part. Taking part is free and involves no obligation to buy anything.",
      ],
    },
    {
      title: "3. How to take part",
      paragraphs: [
        "While voting is open, choose your favourite wine on this website's wine list, enter your name and an email address or phone number, confirm that you are 18 or over and that you accept these rules, and send your vote. Only one entry per person is valid (the same email or phone counts only once). Entries with false details or made automatically do not count.",
      ],
    },
    {
      title: "4. Duration and prize",
      paragraphs: [
        "Each edition starts when the restaurant opens voting and ends at the end of the last day to vote (Spanish time). The prize and that last day are announced in the vote itself and in the “Current edition” box on this page, and do not change while voting is open. The prize cannot be exchanged for cash or for another prize.",
      ],
    },
    {
      title: "5. How the winner is chosen and notified",
      paragraphs: [
        "Within 7 days of the close, the restaurant picks one entry at random from all valid entries, using a random draw system. We notify the winner by the email or phone they gave. If they do not reply within 15 days, turn down the prize or do not meet these rules, another entry is picked at random.",
      ],
    },
    {
      title: "6. Prize delivery",
      paragraphs: [
        "The prize is collected or enjoyed at Casa Tomás restaurant, on a date agreed with the winner, within 3 months of the notification. To collect it, the winner must prove their identity and age with an official document.",
      ],
    },
    {
      title: "7. Taxes",
      paragraphs: [
        "If the value of the prize exceeds 300 €, Casa Tomás will make the corresponding personal income tax (IRPF) payment on account and the winner must include it in their tax return, in accordance with tax regulations.",
      ],
    },
    {
      title: "8. Personal data",
      paragraphs: [
        "We use your name and contact details only to run the prize draw and notify the winner, and we delete them at the end of each edition, as explained in our {privacy}.",
      ],
    },
    {
      title: "9. Other conditions",
      paragraphs: [
        "Casa Tomás may cancel an edition or change its dates for justified reasons, announcing it on this page. These rules are governed by Spanish law.",
      ],
    },
  ],
  drawCurrent: {
    title: "Current edition",
    prize: "Prize:",
    lastDay: "Last day to vote:",
    included: "(inclusive)",
    none: "There is no edition open right now. When one opens, you will see the prize and the last day to vote here.",
  },
};

const fr: TextosChequesSorteo = {
  tocGift: "Conditions d'achat des chèques-cadeaux",
  giftHeading: "Conditions d'achat des chèques-cadeaux",
  giftIntro:
    "Elles s'appliquent aux chèques-cadeaux achetés sur ce site. Vous pouvez les lire avant de payer ; en payant, vous déclarez les avoir lues et acceptées.",
  giftSections: [
    {
      title: "1. Qui les vend",
      paragraphs: [
        `Ils sont vendus par ${SOCIEDAD} (${COMERCIAL}), CIF ${CIF}, dont le siège est situé ${DOMICILIO}. Vous pouvez nous contacter au {phone} ou à {email}.`,
      ],
    },
    {
      title: "2. Ce que c'est et où l'utiliser",
      paragraphs: [
        "Le chèque-cadeau est un bon du montant que vous choisissez, à dépenser en repas et boissons consommés au restaurant Casa Tomás. Il ne permet pas d'acheter des bouteilles de la boutique de vins ni d'être utilisé dans d'autres établissements, et il ne peut pas être échangé contre de l'argent. Si l'addition est inférieure à la valeur du chèque, la différence n'est pas rendue en espèces.",
        "Toute personne qui présente le code peut l'utiliser : vous pouvez donc l'offrir. Conservez-le comme de l'argent et ne le partagez qu'avec la personne à qui vous l'offrez.",
      ],
    },
    {
      title: "3. Prix et paiement",
      paragraphs: [
        "La valeur du chèque cadeau est le montant que vous choisissez. L'achat en ligne peut comprendre des frais de préparation et d'émission pour créer le chèque numérique et son PDF, organiser l'envoi numérique et maintenir la plateforme d'émission. Ils s'appliquent à tous les moyens de paiement et sont indiqués séparément, avec le total, avant le paiement. Les montants incluent les taxes applicables.",
        "Le paiement s'effectue sur la page de paiement sécurisé de Stripe, par carte ou par un autre moyen qu'elle propose. Nous ne voyons ni ne conservons les données de votre carte.",
      ],
    },
    {
      title: "4. Livraison",
      paragraphs: [
        "Une fois le paiement confirmé, nous vous envoyons, à l'adresse e-mail indiquée, le code du chèque et le chèque en PDF, prêt à imprimer ou à transférer. La « date de remise souhaitée » est indicative et figure sur le chèque, mais l'e-mail est toujours envoyé dès la confirmation du paiement. S'il ne vous parvient pas, vérifiez vos courriers indésirables ou écrivez-nous.",
      ],
    },
    {
      title: "5. Validité",
      paragraphs: [
        "Le chèque est valable 12 mois à compter de la date d'achat ; la date exacte figure dans l'e-mail et sur le PDF. Si vous ne pouvez pas l'utiliser à temps, demandez-nous d'en prolonger la validité et nous étudierons votre demande. Passé cette date sans avoir été utilisé ni prolongé, le chèque n'est plus valable et son montant n'est pas remboursé.",
      ],
    },
    {
      title: "6. Comment l'utiliser",
      paragraphs: [
        "Présentez le code, sur votre téléphone ou imprimé, au moment de demander l'addition au restaurant. Nous vous conseillons de réserver une table à l'avance.",
      ],
    },
    {
      title: "7. Si vous perdez le code",
      paragraphs: [
        "Écrivez-nous ou appelez-nous et nous vous le renverrons à l'adresse e-mail utilisée pour l'achat, à condition que le chèque n'ait pas été utilisé.",
      ],
    },
    {
      title: "8. Droit de rétractation : 30 jours pour le rendre",
      paragraphs: [
        "Vous disposez de 30 jours calendaires à compter de l'achat (plus que les 14 jours prévus par la loi) pour vous rétracter et être remboursé, sans avoir à vous justifier, à condition que le chèque n'ait pas été utilisé.",
        "Pour cela, informez-nous avant la fin du délai : par e-mail à {email}, en indiquant le code du chèque, ou en personne au restaurant. Vous pouvez utiliser le modèle de formulaire de la section suivante, mais ce n'est pas obligatoire.",
        "Nous vous rembourserons tout ce que vous avez payé, frais de gestion compris, dans un délai maximal de 14 jours à compter de votre demande, par le même moyen de paiement et sans aucun frais pour vous. Dès ce moment, le code est annulé.",
      ],
    },
    {
      title: "9. Modèle de formulaire de rétractation",
      paragraphs: [
        "(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)",
        `À l'attention de ${SOCIEDAD} (${COMERCIAL}), ${DOMICILIO}, e-mail {email} :`,
        "Je vous notifie par la présente ma rétractation du contrat d'achat du chèque-cadeau suivant : code ______, acheté le ______.",
        "Nom du consommateur : ______. Adresse du consommateur : ______.",
        "Signature du consommateur (uniquement en cas de notification du présent formulaire sur papier) : ______. Date : ______.",
      ],
    },
    {
      title: "10. Facture",
      paragraphs: [
        "Aucune facture n'est émise à l'achat du chèque. Si vous en avez besoin, demandez-la au moment de l'utiliser : au restaurant ou en écrivant à {email} avec le code du chèque et vos données fiscales (nom ou raison sociale, numéro fiscal et adresse).",
      ],
    },
    {
      title: "11. Réclamations, données et droit applicable",
      paragraphs: [
        "Pour toute réclamation, écrivez-nous à {email} ou appelez-nous au {phone} : nous vous répondrons dans les meilleurs délais et au plus tard dans un mois. Vous pouvez aussi demander une feuille de réclamation officielle au restaurant.",
        "Nous traitons les données de l'achat pour le gérer, comme l'explique notre {privacy}. Les présentes conditions sont régies par le droit espagnol ; si vous êtes consommateur, vous pouvez saisir les tribunaux de votre domicile.",
      ],
    },
  ],
  tocDraw: "Règlement du tirage au sort « Votez pour votre vin préféré »",
  drawHeading: "Règlement du tirage au sort « Votez pour votre vin préféré »",
  drawIntro:
    "Il s'applique à chaque édition du tirage au sort entre les personnes qui votent pour leur vin préféré sur la carte des vins de ce site. Participer implique de l'accepter.",
  drawSections: [
    {
      title: "1. Organisateur",
      paragraphs: [`Le tirage au sort est organisé par ${SOCIEDAD} (${COMERCIAL}), CIF ${CIF}, dont le siège est situé ${DOMICILIO}.`],
    },
    {
      title: "2. Qui peut participer",
      paragraphs: [
        "Les personnes âgées de 18 ans ou plus. Les personnes qui travaillent à Casa Tomás ne peuvent pas participer. La participation est gratuite et sans obligation d'achat.",
      ],
    },
    {
      title: "3. Comment participer",
      paragraphs: [
        "Pendant que le vote est ouvert, choisissez votre vin préféré sur la carte des vins de ce site, indiquez votre nom et un e-mail ou un téléphone, confirmez que vous avez 18 ans ou plus et que vous acceptez ce règlement, puis envoyez votre vote. Une seule participation par personne est valable (un même e-mail ou téléphone ne compte qu'une fois). Les participations avec de fausses données ou effectuées de manière automatisée ne comptent pas.",
      ],
    },
    {
      title: "4. Durée et prix",
      paragraphs: [
        "Chaque édition commence lorsque le restaurant ouvre le vote et se termine à la fin du dernier jour pour voter (heure espagnole). Le prix et ce dernier jour sont annoncés dans le vote lui-même et dans l'encadré « Édition en cours » de cette page, et ne changent pas tant que le vote est ouvert. Le prix ne peut être échangé ni contre de l'argent ni contre un autre prix.",
      ],
    },
    {
      title: "5. Désignation et information du gagnant",
      paragraphs: [
        "Dans les 7 jours suivant la clôture, le restaurant tire au sort une participation parmi toutes les participations valables, au moyen d'un système de tirage aléatoire. Nous prévenons la personne gagnante par l'e-mail ou le téléphone indiqué. Si elle ne répond pas dans un délai de 15 jours, renonce au prix ou ne respecte pas ce règlement, une autre participation est tirée au sort.",
      ],
    },
    {
      title: "6. Remise du prix",
      paragraphs: [
        "Le prix est retiré ou utilisé au restaurant Casa Tomás, à une date convenue avec la personne gagnante, dans les 3 mois suivant l'avis. Pour le retirer, il faut justifier de son identité et de sa majorité au moyen d'un document officiel.",
      ],
    },
    {
      title: "7. Impôts",
      paragraphs: [
        "Si la valeur du prix dépasse 300 €, Casa Tomás effectuera le versement d'acompte de l'impôt espagnol sur le revenu (IRPF) correspondant et la personne gagnante devra le déclarer, conformément à la réglementation fiscale.",
      ],
    },
    {
      title: "8. Données personnelles",
      paragraphs: [
        "Nous utilisons votre nom et vos coordonnées uniquement pour gérer le tirage au sort et prévenir la personne gagnante, et nous les supprimons à la fin de chaque édition, comme l'explique notre {privacy}.",
      ],
    },
    {
      title: "9. Autres conditions",
      paragraphs: [
        "Casa Tomás peut annuler une édition ou en modifier les dates pour des raisons justifiées, en l'annonçant sur cette page. Ce règlement est régi par le droit espagnol.",
      ],
    },
  ],
  drawCurrent: {
    title: "Édition en cours",
    prize: "Prix :",
    lastDay: "Dernier jour pour voter :",
    included: "(inclus)",
    none: "Aucune édition n'est ouverte pour le moment. Lorsqu'une édition ouvrira, vous verrez ici le prix et le dernier jour pour voter.",
  },
};

export const TEXTOS_CHEQUES_SORTEO: Record<Language, TextosChequesSorteo> = { es, en, fr };
