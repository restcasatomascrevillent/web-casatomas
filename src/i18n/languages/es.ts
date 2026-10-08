import type { Locale } from "date-fns";
import { es } from "date-fns/locale";

export const translations = {
    header: {
      nav: {
        carta: "Carta",
        novedades: "Novedades",
        reservas: "Reservas",
        espacios: "Espacios",
        nosotros: "Historia",
        contacto: "Contacto",
      },
      cta: "Reservar mesa",
    },
    hero: {
      motto: "Nunca é longo o camiño que conduce á casa dun amigo.",
      ctaPrimary: "Reservar mesa",
      ctaSecondary: "Ver carta",
      ctaAi: "CT AI",
      logoAlt: "Restaurante Casa Tomás",
    },
    carta: {
      title: "Nuestra carta",
      subtitle: "Explora una selección de platos y vinos elegidos con cuidado",
      buttons: {
        platos: "Carta de platos",
        vinos: "Carta de vinos",
        bebidas: "Carta de bebidas",
        pedido: "Mi mesa",
      },
      backToTop: "Volver al inicio",
      pedido: {
        addPlatos: "Añadir platos",
        addVinos: "Añadir vinos",
        addBebidas: "Añadir bebidas",
        yourOrder: "Tu mesa",
        backToOrder: "Volver a Mi mesa",
      },
    },
    platos: {
      searchPlaceholder: "Buscar platos...",
      loading: "Cargando carta...",
      add: "Añadir",
      addAria: "Añadir {name} a Mi mesa",
      addMoreAria: "Añadir otra vez {name} a Mi mesa (ya hay {qty})",
      viewPhoto: "Ver foto",
      hidePhoto: "Ocultar foto",
      viewInfo: "Ver ingredientes y alérgenos",
      hideInfo: "Ocultar ingredientes y alérgenos",
      allergensTitle: "Alérgenos",
      ingredientsTitle: "Ingredientes",
      empty: "No hay platos que coincidan con los filtros seleccionados",
      dietaryTitle: "Filtrar por necesidades",
      dietaryFilters: {
        celiaquia: "Celiaquía",
        lactosa: "Lactosa",
        vegano: "Vegano",
        vegetariano: "Vegetariano",
      },
      toasts: {
        errorTitle: "Error",
        errorDescription: "No pudimos cargar los platos",
        addedTitle: "Añadido a Mi mesa",
        addedDescription: "{name} ya está en tu mesa",
      },
    },
    vinos: {
      ageCheckTitle: "Verificación de edad",
      ageCheckDescription: "Para ver nuestra carta de vinos, confirma que tienes 18 años o más.",
      ageCheckConfirm: "Tengo 18+",
      ageCheckDecline: "Soy menor de 18",
      ageCheckBlocked: "Lo sentimos, debes tener 18+ para ver esta sección.",
      searchPlaceholder: "Buscar vinos...",
      loading: "Cargando vinos...",
      viewPhoto: "Ver foto",
      hidePhoto: "Ocultar foto",
      viewInfo: "Ver alérgenos",
      hideInfo: "Ocultar alérgenos",
      allergensTitle: "Alérgenos",
      originLabel: "Origen",
      doLabel: "D.O.",
      add: "Añadir",
      empty: "No hay vinos que coincidan con los filtros seleccionados",
      toasts: {
        errorTitle: "Error",
        errorDescription: "No pudimos cargar los vinos",
        addedTitle: "Añadido a Mi mesa",
        addedDescription: "{name} ya está en tu mesa",
      },
      categoriesAll: "Todas",
    },
    bebidas: {
      searchPlaceholder: "Buscar bebidas...",
      loading: "Cargando bebidas...",
      add: "Añadir",
      empty: "No hay bebidas que coincidan con los filtros seleccionados",
      toasts: {
        errorTitle: "Error",
        errorDescription: "No pudimos cargar las bebidas",
        addedTitle: "Añadido a Mi mesa",
        addedDescription: "{name} ya está en tu mesa",
      },
    },
    preview: {
      title: "Mi mesa",
      subtitle: "Lo que os apetece, el total y cuánto toca a cada uno",
      note: "Precios orientativos · no es un pedido online",
      emptyTitle: "Añade platos y vinos para preparar tu mesa",
      emptySubtitle: "Elige en la carta lo que os apetece, compártelo con tu mesa y dividid la cuenta.",
      emptyCta: "Ver la carta",
      totalLabel: "Total",
      subtotalLabel: "Subtotal",
      close: "Cerrar Mi mesa",
      thanks: "¡Os esperamos en Casa Tomás!",
      floatingLabel: "Mi mesa",
      openTicketAria: "Abrir Mi mesa ({count} en la mesa)",
      guestsLabel: "Comensales",
      guestsDecrease: "Quitar un comensal",
      guestsIncrease: "Añadir un comensal",
      guestsCount: "{n} comensales",
      guestsCountOne: "1 comensal",
      perPerson: "≈ {amount} por persona",
      splitLabel: "Cómo dividís la cuenta",
      splitEqual: "A partes iguales",
      splitEach: "Cada uno lo suyo",
      splitEachHint: "Toca a quién comparte cada plato (puede ser más de uno). Lo que quede sin marcar se reparte entre todos.",
      personDefault: "Persona {n}",
      personNameAria: "Nombre de la persona {n}",
      assignAria: "¿Para quién es {name}?",
      shared: "Para compartir",
      sharedLine: "Para compartir: {amount} ({each} c/u)",
      lineIncrease: "Añadir más {name}",
      lineDecrease: "Quitar un poco de {name}",
      lineRemove: "Quitar {name} de Mi mesa",
      clear: "Vaciar mesa",
      clearConfirm: "¿Vaciar Mi mesa?",
      clearYes: "Sí, vaciar",
      clearNo: "Cancelar",
      bookCta: "Reservar mesa para {n}",
      aiPrompt: "Pregunta a Tomy: ¿es suficiente para {n}? ¿qué vino pega?",
      aiQuestion: "Somos {n}. ¿Es suficiente con esto? ¿Qué vino nos recomiendas? Tenemos: {items}",
      aiQuestionMore: "y {n} más",
      ticket: {
        date: "Fecha",
        guests: "Comensales",
        qr: "Escanea para ver la carta",
        perPersonTitle: "Por persona",
      },
      share: {
        cta: "Compartir con la mesa",
        download: "Descargar imagen",
        generating: "Preparando la imagen…",
        errorTitle: "No se pudo preparar la imagen",
        error: "Inténtalo de nuevo o descarga la imagen.",
        previewTitle: "Comparte el ticket",
        previewHintMobile: "Mantén pulsada la imagen para compartirla o guardarla en tu galería.",
        previewHintDesktop: "Haz clic derecho sobre la imagen para copiarla, o descárgala con el botón de abajo.",
        previewShareCta: "Compartir imagen",
        previewDownloadCta: "Descargar imagen",
        summaryTitle: "Mi mesa en Casa Tomás",
        summaryTotal: "Total orientativo: {amount}",
        summaryPerPerson: "≈ {amount} por persona ({n} comensales)",
        summaryLink: "La carta: {url}",
      },
    },
    novedades: {
      title: "Novedades",
      subtitle: "Nuevas incorporaciones y experiencias que queremos compartir",
      empty: "No hay novedades en este momento",
      error: "No se pudieron cargar las novedades",
      loading: "Cargando novedades...",
    },
    espacios: {
      title: "Nuestros espacios",
      subtitle: "Un entorno para cada ocasión",
      cards: [
        {
          title: "Salón",
          description: "Amplia y acogedora, ideal para reuniones familiares y eventos especiales",
        },
        {
          title: "Comedor",
          description: "Una sala íntima para comidas de negocios o celebraciones privadas",
        },
        {
          title: "Terraza",
          description: "Disfruta de nuestra cocina al aire libre con un ambiente relajado",
        },
        {
          title: "Touza Cocktail Bar",
          description: "Cócteles de autor en un entorno elegante y exclusivo",
        },
      ],
      galleryButton: "Ver galería de fotos",
      visitTouza: "Visitar Touza Cocktail",
      middayMenuTitle: "Menú de mediodía",
      middayMenuDescription: "De martes a jueves, disfruta de un menú de mediodía de temporada elaborado con producto fresco.",
      todayMenuTitle: "Menú de hoy",
      todayTapasTitle: "Tapas de hoy",
      todayMenuCta: "Ver menú de hoy",
      todayTapasCta: "Ver tapas de hoy",
      noMenuToday: "No hay menú disponible hoy",
      noTapasToday: "No hay tapas disponibles hoy",
      tapasTitle: "Tapas de los jueves",
      tapasDescription: "Cada jueves por la noche (excepto festivos), descubre nuestra selección de tapas.",
      menuLabels: {
        starters: "Entrantes",
        mains: "Principales",
        dessert: "Postre",
        desserts: "Postres",
        tapasOfDay: "Tapas de la semana",
      },
      /**
       * Alérgenos del menú del día. Van plegados en la carta (ver
       * `components/espacios/CartaDelDia`): lo declarado por el restaurante y
       * lo deducido de los ingredientes se enseñan por separado, porque no
       * tienen la misma fiabilidad.
       */
      menuAllergens: {
        summary: "Alérgenos",
        declared: "Declarados por el restaurante",
        inferred: "Deducidos de los ingredientes",
        inferredHint: "Orientativo: confírmelo con el personal.",
      },
      menus: [
        {
          date: new Date(2025, 0, 28),
          primeros: ["Ensalada templada de setas y parmesano", "Crema de zanahoria asada con jengibre"],
          segundos: ["Lubina al horno con hinojo", "Carrillera de cerdo al vino blanco"],
          postre: "Flan cremoso de vainilla",
        },
        {
          date: new Date(2025, 0, 30),
          primeros: ["Ensalada de quinoa, granada y queso feta", "Crema de marisco con toques de brandy"],
          segundos: ["Corvina a la brasa con emulsión de lima", "Cochinillo confitado con puré de manzana y romero"],
          postre: "Tarta fina de manzana con crema inglesa",
        },
        {
          date: new Date(2025, 0, 23),
          primeros: ["Crema de calabaza asada y jengibre", "Brocheta de pulpo y patata"],
          segundos: ["Arroz meloso de setas y parmesano", "Lomo de rape al horno con ajada"],
          postre: "Torrija caramelizada con helado de canela",
        },
        {
          date: new Date(2025, 0, 22),
          primeros: ["Vichyssoise de puerro y trufa", "Ensalada de tomate raff con ventresca"],
          segundos: ["Merluza en salsa verde con almejas", "Presa ibérica a la brasa con pimientos"],
          postre: "Coulant de chocolate con helado de vainilla",
        },
        {
          date: new Date(2025, 0, 21),
          primeros: ["Crema de boniato asado con naranja", "Ensalada templada de alcachofas y jamón"],
          segundos: ["Bacalao confitado con pil-pil cítrico", "Carrillera de ternera glaseada al mencía"],
          postre: "Tarta de limón con merengue tostado",
        },
      ],
      tapas: [
        {
          date: new Date(2025, 1, 20),
          tapas: ["Bruschetta de tomate y albahaca", "Mini hamburguesa de ternera", "Croqueta de pollo y maíz", "Taco de pescado crujiente"],
        },
        {
          date: new Date(2025, 1, 6),
          tapas: ["Bao de panceta lacada con pepino encurtido", "Pincho de tortilla con trufa", "Gambón al ajillo y lima", "Queso payoyo con miel de romero"],
        },
        {
          date: new Date(2025, 0, 30),
          tapas: ["Gyoza crujiente de marisco", "Pulpo a la brasa con mojo rojo", "Tartar de atún rojo con aguacate", "Tortilla jugosa de chistorra"],
        },
        {
          date: new Date(2025, 0, 23),
          tapas: ["Montadito de solomillo y cebolla confitada", "Croquetas cremosas de jamón ibérico", "Tosta de sardina ahumada con tomate", "Bravas de la casa con alioli de ajo negro"],
        },
      ],
    },
    reservas: {
      title: "Reserva tu mesa",
      subtitle: "Disfruta de una experiencia gastronómica memorable en Casa Tomás",
      cta: "Reservar ahora",
      hint: "Consulta disponibilidad y confirma en tres pasos.",
      backToSite: "Volver al sitio web",
      disclaimer: {
        title: "Importante:",
        note: "Enviar el formulario es una solicitud, no una reserva confirmada: el restaurante la revisa y te envía un email con la propuesta. La reserva queda confirmada cuando la confirmas desde ese email. Casa Tomás queda exento de responsabilidad hasta ese momento.",
        callUs: "Si no hay disponibilidad online, llámanos al",
        steps: [
          "Consultar disponibilidad (cliente)",
          "Solicitar reserva (cliente)",
          "Verificación de reserva (Casa Tomás)",
          "Confirmar reserva (recibirás el correo de confirmación)",
        ],
      },
    },
    reservasPage: {
      seoTitle: "Reservar mesa | Casa Tomás Restaurante en Crevillent",
      seoDescription: "Reserva tu mesa en Casa Tomás, restaurante de cocina tradicional en Crevillent (Alicante). Reservas online rápidas y sencillas.",
      keywords: ["reservar mesa Crevillent", "reservas Casa Tomás", "reservar restaurante Alicante"],
      breadcrumb: "Reservar mesa",
    },
    reservationForm: {
      /*
       * OJO al título: la reserva se crea en estado `pendiente` (lo manda así
       * el propio formulario y así la devuelve `reservas-web/crear`), de modo
       * que "¡Reserva confirmada!" era falso — y además contradecía el aviso
       * que la misma página enseña dos bloques más arriba ("no queda
       * confirmada hasta que recibas el email"). Un cliente que leía eso se
       * presentaba creyendo que tenía mesa.
       */
      successTitle: "Solicitud recibida",
      successLead: "Aún no es una reserva confirmada: el restaurante revisará tu solicitud y te enviará un email con la propuesta. Queda confirmada cuando la confirmas desde ese email.",
      successLine3: "Guarda este resguardo: es el único acuse de que tu solicitud ha llegado.",
      successButton: "Volver al inicio",
      successCloseAria: "Cerrar el resguardo",
      successTicket: {
        documentType: "Solicitud de reserva",
        stamp: "Pendiente de confirmar",
        nameLabel: "Nombre",
        dateLabel: "Fecha",
        timeLabel: "Hora",
        guestsLabel: "Comensales",
        emailLabel: "Confirmación a",
        emailHint: "Ahora no recibirás ningún correo: tras revisar tu solicitud, el restaurante te escribirá a esta dirección con la propuesta, y la reserva queda confirmada cuando la confirmes desde ese email. Revisa también la carpeta de spam.",
        stepCaption: "Paso {done} de {total}",
        /* Los mismos cuatro pasos que anuncia `reservas.disclaimer.steps`. */
        steps: [
          "Disponibilidad consultada",
          "Solicitud enviada",
          "Verificación de Casa Tomás",
          "Confirmación por correo",
        ],
        stepDone: "completado",
        stepPending: "pendiente",
        thanks: "Gracias por elegir Casa Tomás.",
        issuedLabel: "Solicitud registrada",
      },
      stepOne: "Paso 1: Elige fecha y número de comensales",
      dateLabel: "Fecha *",
      datePlaceholder: "Selecciona una fecha",
      roomLabel: "Sala preferida *",
      roomPlaceholder: "Selecciona una sala",
      guestsLabel: "Número de comensales *",
      checkAvailability: "Comprobar disponibilidad",
      checkingAvailability: "Comprobando disponibilidad...",
      stepTwo: "Paso 2: Elige tu hora preferida",
      timesLabel: "Horarios disponibles *",
      fullLabel: "Completo",
      lunchLabel: "Comida",
      dinnerLabel: "Cena",
      stepThree: "Paso 3: Cuéntanos sobre ti",
      infoTitle: "Cuéntanos sobre ti",
      nameLabel: "Nombre completo *",
      namePlaceholder: "Tu nombre",
      phoneLabel: "Teléfono *",
      emailLabel: "Email *",
      emailPlaceholder: "tu@email.com",
      notesLabel: "Peticiones especiales",
      notesPlaceholder: "Alergias, preferencias, ocasión...",
      termsLabel: "He leído y acepto las {terms} y la {privacy} *",
      termsLink: "condiciones de reserva",
      privacyLink: "política de privacidad",
      newTabHint: "(se abre en una pestaña nueva)",
      newsletterLabel: "Quiero recibir la newsletter de Casa Tomás (novedades, eventos y ofertas). Me apuntaréis cuando confirme mi reserva desde el correo que me enviaréis. Puedo darme de baja en cualquier momento.",
      newsletterTermsLink: "Ver condiciones de la newsletter",
      submit: "Reservar ahora",
      submitting: "Reservando...",
      footer: "Reservas online seguras y rápidas",
      toasts: {
        missingFields: "Selecciona una fecha y el número de comensales",
        availabilityFull: "¡Todos los horarios disponibles para esta fecha!",
        availabilityChecked: "Disponibilidad actualizada",
        closedDay: "Ese día el restaurante no está disponible. Elige otra fecha.",
        availabilityOfflineTitle: "Parece que te has quedado sin conexión",
        availabilityOfflineDescription: "En cuanto la recuperes, vuelve a intentarlo.",
        availabilityServerErrorTitle: "No es cosa tuya: el fallo es nuestro",
        availabilityServerErrorDescription: "No podemos consultar las horas libres ahora mismo. Llámanos al {phone} y te la reservamos por teléfono.",
        noSlots: "No queda ninguna hora libre ese día. Prueba con otra fecha, o llámanos al {phone}.",
        missingRoom: "No pudimos encontrar los detalles de la sala",
        missingTime: "Selecciona un horario disponible",
        submitErrorTitle: "Error de reserva",
        submitErrorDescription: "Inténtalo de nuevo o contacta con nosotros.",
      },
      rejection: {
        title: "No hemos podido completar la reserva",
        close: "Entendido",
        closeAria: "Cerrar el aviso",
        reasons: {} as Record<string, string>,
        invalidMessage: "Hay algún dato del formulario que no hemos podido leer.",
        offlineTitle: "Parece que te has quedado sin conexión",
        offlineMessage: "Tu solicitud no ha salido porque se ha perdido la conexión.",
        errorMessage: "El fallo es nuestro, no tuyo: tu solicitud no ha llegado a registrarse.",
        fallbackMessage: "No hemos podido registrar tu solicitud.",
        exits: {
          call: "Llámanos al {phone} y la gestionamos contigo.",
          otherTime: "Elige otra de las horas disponibles, o prueba con otra fecha.",
          otherTimeOrCall: "Elige otra hora, o llámanos al {phone}.",
          otherDate: "Elige otra fecha en el calendario y vuelve a comprobar la disponibilidad.",
          guests: "Ajusta el número de comensales, o llámanos al {phone} para grupos.",
          checkForm: "Revisa el nombre, el teléfono, el email y la fecha, y vuelve a enviarlo.",
          retryOrCall: "Inténtalo de nuevo en unos minutos, o llámanos al {phone}.",
          offline: "Vuelve a enviarla cuando la recuperes. Si te corre prisa, llámanos al {phone}.",
        },
      },
      roomNotSpecified: "No especificado",
      largeGroupNotice: "Para grupos de más de 12 personas, llámanos al {phone} y lo organizamos contigo.",
    },
    tomy: {
      cta: "Pregunta a Tomy",
      aria: "Abrir el chat con Tomy, el asistente de Casa Tomás",
    },
    mobileCta: {
      call: "Llamar",
      callAria: "Llamar a Casa Tomás",
      reserve: "Reservar mesa",
    },
    reviews: {
      title: "Reseñas de clientes",
      subtitle: "Lo que dicen nuestros visitantes",
      cta: "Dejar una reseña en Google",
    },
    nosotros: {
      title: "Historia",
      intro: [
        "En 1998, Tomás Vázquez González dejó su pueblo natal de A Touza (Ourense) rumbo a Crevillente con una idea clara: abrir un bar familiar donde se comiera bien y se sintiera aún mejor.",
        "Ese sueño comenzó en el antiguo Bar Manuel, regentado por sus tíos Rosa y Manuel, que confiaron en Tomás para mantenerlo vivo. Pronto pasó a llamarse Bar Tomás y su toque gallego convirtió aquel rincón en un favorito del barrio.",
        "Con el tiempo, el boca a boca y el cariño de la comunidad hicieron posible el siguiente paso: un restaurante de verdad. Casa Tomás nació en la calle Santa María de la Cabeza, donde hoy seguimos recibiendo a nuestros comensales y buscamos que cada visita se sienta como volver a casa.",
      ],
      moreTitle: "Mucho más que un restaurante",
      moreBody: [
        "Casa Tomás siempre ha sido cercano, familiar y de barrio. El amor de Tomás por la cocina y su impulso profesional hacen que el restaurante siga evolucionando: producto de calidad, recetas cuidadas y un servicio genuino y personal.",
        "Gracias a quienes vuelven una y otra vez para probar nuestros platos, Casa Tomás se ha convertido en un pequeño referente gastronómico en Alicante, sin perder nunca su alma de barrio.",
      ],
      legacyTitle: "De padres a hijos",
      legacyBody: [
        "Hoy la historia continúa de la forma más significativa. Hugo, el hijo de Tomás, trabaja codo con codo con su padre, aprendiendo cada detalle que hace sentir especial a cada comensal.",
        "Casa Tomás es el recorrido personal y profesional de una familia dedicada a la cocina tradicional, con un objetivo desde 1998: que cada cliente se marche con un recuerdo cálido y sabroso.",
      ],
      teamTitle: "Conoce al equipo",
      team: [
        {
          nombre: "Tomás",
          rol: "Propietario y anfitrión",
          descripcion:
            "Con más de 30 años de experiencia, Tomás ha transformado una tradición familiar en una cocina de autor. Su amor por el producto local y las recetas de siempre marcan el corazón de Casa Tomás.",
        },
        {
          nombre: "Hugo",
          rol: "La nueva generación",
          descripcion:
            "Trabajando junto a Tomás, Hugo representa a la nueva generación: mantiene la tradición mientras aporta energía y visión fresca al comedor.",
        },
        {
          nombre: "Antxon",
          rol: "Jefe de cocina",
          descripcion:
            "Un maestro de la precisión y el sabor, Antxon lidera la cocina con cuidado y dedicación, asegurando la excelencia en cada plato.",
        },
      ],
    },
    contacto: {
      title: "Contacto",
      subtitle: "Estamos aquí para ayudarte",
      infoTitle: "Datos de contacto",
      addressLabel: "Dirección",
      addressLines: [
        "Carrer Santa Maria de la Cabeza, 2",
        "03330 Crevillent, Alicante",
        "España",
      ],
      phoneLabel: "Teléfono",
      emailLabel: "Email",
      hoursTitle: "Horario",
      schedule: [
        { day: "Lunes", hours: "Cerrado" },
        { day: "Martes - Jueves", hours: "09:30 - 23:00" },
        { day: "Viernes", hours: "09:00 - 23:30" },
        { day: "Sábado", hours: "10:30 - 23:30" },
        { day: "Domingo", hours: "11:00 - 16:00" },
      ],
      giftTitle: "Regala una experiencia",
      giftDescription:
        "Sorprende a alguien especial con un cheque regalo de Casa Tomás: una experiencia gastronómica inolvidable.",
      giftAmountLabel: "Importe del regalo (€)",
      giftPlaceholder: "50",
      giftButton: "Comprar cheque regalo",
      giftSuggested: "Importes sugeridos",
      giftNote: "* Los cheques regalo son válidos durante 12 meses desde la fecha de compra",
      giftDialogTitle: "Completa los datos del cheque regalo",
      giftDialogDescription:
        "Te llevamos a un pago seguro con tarjeta (Stripe). En cuanto se confirme, recibirás el código por email.",
      giftFormAmountSummary: "Importe: {amount} €",
      giftFormBuyerName: "Tu nombre",
      giftFormBuyerNamePlaceholder: "María López",
      giftFormBuyerEmail: "Tu email",
      giftFormBuyerEmailPlaceholder: "maria@email.com",
      giftFormBuyerPhone: "Teléfono (opcional)",
      giftFormBuyerPhonePlaceholder: "612 345 678",
      giftFormRecipientName: "¿Para quién es? (opcional)",
      giftFormRecipientNamePlaceholder: "Ej. Papá",
      giftFormMessage: "Mensaje personal (opcional)",
      giftFormMessagePlaceholder: "Feliz cumpleaños...",
      giftFormDeliveryDate: "Fecha deseada de entrega (opcional)",
      giftFormSubmit: "Ir al pago seguro",
      giftFormSubmitting: "Conectando con el pago...",
      giftInvoiceRequest: "Quiero recibir la factura por email",
      giftInvoiceDescription: "Recibirás un PDF en el email de compra cuando se confirme el pago.",
      giftInvoiceName: "Nombre o razón social",
      giftInvoiceTaxId: "NIF / CIF",
      giftInvoiceAddress: "Dirección fiscal completa (incluye código postal y localidad)",
      giftInvoiceNotReady: "La facturación todavía no está disponible. Contacta con el restaurante antes de pagar.",
      giftInvoiceMissingData: "Completa nombre, NIF y dirección fiscal para recibir la factura.",
      giftFormCancel: "Cancelar",
      toasts: {
        errorTitle: "Error",
        errorDescription: "Introduce un importe válido",
        giftMissingName: "Escribe tu nombre",
        giftInvalidEmail: "Escribe un email válido",
        giftPaymentErrorTitle: "No se pudo iniciar el pago",
        giftPaymentErrorDescription: "Inténtalo de nuevo en unos minutos o llama al restaurante.",
        giftSuccessTitle: "¡Gracias por tu compra!",
        giftSuccessDescription: "Te mandaremos el código por email en cuanto se confirme el pago, normalmente en unos instantes.",
        giftCancelTitle: "Pago cancelado",
        giftCancelDescription: "No se ha realizado ningún cargo. Puedes intentarlo de nuevo cuando quieras.",
      },
    },
    footer: {
      description: "Tradición familiar convertida en arte culinario desde hace más de 30 años.",
      quickLinks: "Enlaces rápidos",
      menuLink: "Nuestra carta",
      reserveLink: "Reservar mesa",
      websiteLink: "Sitio web",
      contactTitle: "Contacto",
      rights: "© 2026 Restaurante Casa Tomás. Todos los derechos reservados.",
      admin: "Administración",
      terms: "Política de privacidad",
      bookingTerms: "Condiciones de reserva y newsletter",
      cookieSettings: "Configurar cookies",
    },
    cookie: {
      title: "Política de cookies",
      message:
        "Usamos cookies necesarias para que la web funcione. Las del mapa interactivo de vinos son opcionales y solo se activan si las aceptas. Más información en nuestra",
      link: "Política de cookies",
      reject: "Rechazar",
      configure: "Configurar",
      accept: "Aceptar todas",
      dialogTitle: "Configurar cookies",
      dialogDescription: "Elige qué cookies aceptas. Puedes cambiarlo cuando quieras desde \"Configurar cookies\" en el pie de página.",
      necessaryTitle: "Necesarias",
      necessaryDescription: "Idioma, tu pedido en \"Mi mesa\" y recordar que confirmaste tu edad para ver la carta de vinos. Imprescindibles para que la web funcione: siempre activas.",
      mapsTitle: "Mapa interactivo de vinos",
      mapsDescription: "Carga el mapa de Mapbox en la carta de vinos para mostrar el origen de cada denominación. Mapbox recibe datos de uso anónimos al mostrarlo.",
      mapsDisabledNotice: "Activa las cookies del mapa para ver de dónde vienen nuestros vinos.",
      mapsEnableCta: "Activar mapa",
      save: "Guardar preferencias",
    },
    map: {
      title: "De dónde vienen nuestros vinos",
      subtitle: "Toca un marcador para ver vinos de cada región",
      countSingle: "{count} vino",
      countPlural: "{count} vinos",
      aboutDO: "Sobre esta D.O.",
      showAll: "Ver los {count} vinos",
      showLess: "Ver menos",
      showMore: "Mostrar más",
      otherOrigins: "Otros orígenes de nuestra carta",
      noLocation: "Origen sin especificar",
      errorTitle: "Error",
      errorDescription: "No pudimos cargar el mapa",
    },
    categories: {
      platos: {
        "NOVEDADES DEL DÍA": "Novedades del día",
        SNACK: "Snacks",
        "ENTRANTES FRÍOS": "Entrantes fríos",
        "ENTRANTES CALIENTES": "Entrantes calientes",
        ENSALADAS: "Ensaladas",
        SALAZONES: "Salazones",
        MARISCOS: "Mariscos",
        PESCADOS: "Pescados",
        CARNES: "Carnes",
        ARROCES: "Arroces",
        POSTRES: "Postres",
        TODOS: "Todos",
      },
      bebidas: {
        Aguas: "Aguas",
        Refrescos: "Refrescos",
        Tónicas: "Tónicas",
        Cervezas: "Cervezas",
        "Tintos de verano": "Tintos de verano",
        TODAS: "Todas",
      },
    },
    /*
     * Página /condiciones (reserva + newsletter). En los párrafos, `{phone}` y
     * `{privacy}` se pintan como enlaces (teléfono y política de privacidad).
     */
    conditionsPage: {
      seoTitle: "Condiciones de reserva y newsletter | Casa Tomás Restaurante",
      seoDescription: "Condiciones de las reservas y de la newsletter de Casa Tomás Restaurante (Crevillent, Alicante): confirmación, puntualidad, cancelaciones, grupos, envíos, baja y datos personales.",
      back: "Volver al inicio",
      title: "Condiciones de reserva y newsletter",
      updated: "Última actualización: octubre de 2026",
      intro: "En esta página tienes las condiciones de las reservas en Restaurante Casa Tomás y las de su newsletter.",
      tocLabel: "En esta página",
      bookingHeading: "Condiciones de reserva",
      bookingIntro: "Se aplican a las reservas tanto desde esta web como por teléfono. Al enviar una solicitud de reserva declaras haberlas leído y aceptado.",
      bookingSections: [
        {
          title: "1. Cómo se confirma tu reserva",
          paragraphs: [
            "Enviar el formulario es una solicitud de reserva, no una reserva confirmada: queda pendiente mientras el restaurante la revisa, y hasta que se confirme Casa Tomás no puede garantizarte la mesa.",
            "Cuando la hayamos revisado, te enviaremos un email con la propuesta de reserva. La reserva queda confirmada cuando pulsas en ese email el botón para confirmarla y lo confirmas en la página que se abre; después recibirás un email de confirmación.",
            "Si te proponemos una hora distinta de la que pediste, desde ese mismo email puedes aceptarla, y la reserva queda confirmada, o rechazarla, y la reserva queda cancelada.",
            "Si no te llega el correo, revisa la carpeta de spam o llámanos al {phone}.",
          ],
        },
        {
          title: "2. Puntualidad",
          paragraphs: [
            "Te guardamos la mesa durante 15 minutos a partir de la hora reservada. Pasado ese tiempo sin noticias tuyas, la mesa puede liberarse y asignarse a otros clientes.",
            "Si vas a llegar tarde, llámanos al {phone} y haremos lo posible por mantenértela.",
          ],
        },
        {
          title: "3. Cancelaciones y cambios",
          paragraphs: [
            "Si no puedes venir o necesitas cambiar la fecha, la hora o el número de comensales, avísanos con la mayor antelación posible: desde el enlace del email de tu reserva o llamándonos al {phone}. Así podremos ofrecer la mesa a otras personas.",
          ],
        },
        {
          title: "4. Grupos grandes",
          paragraphs: [
            "Las reservas para grupos de más de 12 personas no se hacen desde la web: las gestiona directamente el restaurante. Llámanos al {phone} y lo organizamos contigo, incluidas las condiciones particulares que pueda requerir el grupo.",
          ],
        },
        {
          title: "5. Mesa y espacio",
          paragraphs: [
            "La reserva te garantiza sitio para el número de comensales indicado, no una mesa ni una zona concretas del restaurante. Si tienes alguna preferencia, indícala en «Peticiones especiales» y haremos lo posible por atenderla, pero la distribución de las mesas la decide el restaurante.",
          ],
        },
        {
          title: "6. Ausencias sin aviso",
          paragraphs: [
            "Cuando una reserva no se presenta y no se ha cancelado, esa mesa se queda vacía y otras personas se quedan sin sitio. Las ausencias reiteradas sin aviso pueden impedir que hagas nuevas reservas.",
          ],
        },
        {
          title: "7. Tus datos personales",
          paragraphs: [
            "Los datos que nos das al reservar (nombre, teléfono, email y los detalles de la reserva) los usamos para gestionar tu reserva, tal como se explica en nuestra {privacy}.",
            "La newsletter es independiente de la reserva: solo la recibirás si la pides marcando su casilla y después confirmas tu reserva desde el enlace del email que te enviamos. No es necesaria para reservar y puedes darte de baja en cualquier momento desde el enlace de cada email.",
          ],
        },
      ],
      newsletterHeading: "Condiciones de la newsletter",
      newsletterIntro: "Se aplican solo si, al reservar, marcas la casilla para recibir la newsletter de Casa Tomás.",
      newsletterSections: [
        {
          title: "1. Qué recibirás",
          paragraphs: [
            "Correos con novedades, eventos, menús especiales y ofertas de Casa Tomás.",
          ],
        },
        {
          title: "2. Cuándo empiezas a recibirla",
          paragraphs: [
            "Marcar la casilla todavía no te apunta. Te apuntamos solo después de que confirmes tu reserva desde el enlace del email que te enviamos: así comprobamos que el email es tuyo.",
            "Si la reserva se confirma por otra vía (por ejemplo, por teléfono) o se cancela antes de que la confirmes desde ese email, no te apuntamos a la newsletter.",
          ],
        },
        {
          title: "3. Con qué frecuencia",
          paragraphs: [
            "Los envíos son ocasionales: no nos comprometemos a una frecuencia fija y solo te escribiremos cuando tengamos algo que contarte.",
          ],
        },
        {
          title: "4. Qué datos usamos y para qué",
          paragraphs: [
            "Usamos el email y el nombre que indicaste en tu reserva con la única finalidad de enviarte la newsletter.",
          ],
        },
        {
          title: "5. Base legal: tu consentimiento",
          paragraphs: [
            "La base legal es tu consentimiento. Es voluntario y no es necesario para reservar: si no marcas la casilla, tu reserva se tramita exactamente igual.",
          ],
        },
        {
          title: "6. Baja",
          paragraphs: [
            "Puedes darte de baja en cualquier momento y sin ningún coste desde el enlace que incluye cada email. La baja es inmediata y no afecta a tus reservas.",
          ],
        },
        {
          title: "7. Constancia del consentimiento",
          paragraphs: [
            "Guardamos la fecha en que diste tu consentimiento (al marcar la casilla) y la fecha en que confirmaste tu email desde el enlace de tu reserva, como prueba de ambos.",
          ],
        },
        {
          title: "8. Destinatarios",
          paragraphs: [
            "No cedemos tus datos a terceros. Para hacer los envíos usamos un proveedor de envío de correo electrónico que actúa como encargado del tratamiento: trata los datos solo por cuenta de Casa Tomás y siguiendo sus instrucciones.",
          ],
        },
        {
          title: "9. Tus derechos",
          paragraphs: [
            "Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, o reclamar ante la autoridad de control, tal como se explica en nuestra {privacy}.",
          ],
        },
      ],
      privacyLink: "política de privacidad",
      contactTitle: "Contacto",
      contactIntro: "Para cualquier duda sobre tu reserva:",
      homeLink: "Inicio",
      privacyFooterLink: "Política de privacidad",
    },
    /* Etiquetas ARIA de los botones del calendario (react-day-picker las trae en inglés). */
    calendar: {
      previousMonth: "Mes anterior",
      nextMonth: "Mes siguiente",
    },
    validation: {
      nameMin: "El nombre debe tener al menos 2 caracteres",
      nameMax: "El nombre no puede superar los 100 caracteres",
      phoneInvalid: "Introduce un teléfono válido con prefijo (p. ej. +34 612345678)",
      emailInvalid: "Introduce un email válido",
      emailMax: "El email no puede superar los 255 caracteres",
      dateRequired: "Selecciona una fecha",
      guestsMin: "Mínimo 1 comensal",
      guestsMax: "Máximo 20 comensales",
      roomRequired: "Selecciona una sala",
      notesMax: "Las notas no pueden superar los 500 caracteres",
      termsRequired: "Para reservar tienes que aceptar las condiciones de reserva y la política de privacidad",
    },
    notFound: {
      title: "404",
      message: "Ups, página no encontrada",
      back: "Volver al inicio",
    },
    adminLogin: {
      title: "Portal de administración",
      description: "Acceso para la gestión de contenidos del restaurante",
      emailLabel: "Email",
      emailPlaceholder: "admin@casatomas.com",
      passwordLabel: "Contraseña",
      submit: "Iniciar sesión",
      comingSoonTitle: "Próximamente",
      comingSoonDescription: "El sistema de administración estará disponible en breve.",
      back: "Volver al inicio",
    },
    migration: {
      title: "Migración de datos",
      description: "Mover los datos de platos y vinos del JSON a la base de datos",
      start: "Iniciar migración",
      loading: "Migrando datos...",
      successTitle: "¡Migración completada!",
      successLine: "{count} {label} migrados",
      successSummary: "{platos} {platosLabel} y {vinos} {vinosLabel} migrados",
      errorTitle: "Error de migración",
      errorDescription: "Hubo un error al ejecutar la migración",
      back: "Volver al inicio",
      platosLabel: "platos",
      vinosLabel: "vinos",
    },
  } as const;

// Turn literal values into broad primitive types while preserving the full shape.
type DeepWiden<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends null ? null :
  T extends undefined ? undefined :
  T extends Date ? Date :
  T extends Array<infer U> ? Array<DeepWiden<U>> :
  T extends object ? { [K in keyof T]: DeepWiden<T[K]> } :
  T;

export type Translations = DeepWiden<typeof translations>;

export type LanguagePack = {
  translations: Translations;
  dateLocale: Locale;
};

const pack: LanguagePack = {
  translations,
  dateLocale: es,
};

export default pack;


