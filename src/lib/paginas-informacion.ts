export const PAGINAS_INFORMACION = {
  "/el-restaurante": {
    es: { h1: "El restaurante Casa Tomás en Crevillente", title: "El restaurante Casa Tomás en Crevillente", description: "Conoce Casa Tomás: nuestra historia desde 1998, raíces gallegas, cocina mediterránea y espacios para disfrutar en Crevillente, Alicante." },
    en: { h1: "About Casa Tomás restaurant in Crevillente", title: "About Casa Tomás restaurant in Crevillente", description: "Discover Casa Tomás: our history since 1998, Galician roots, Mediterranean cooking and dining spaces in Crevillente, Alicante." },
    fr: { h1: "Le restaurant Casa Tomás à Crevillente", title: "Le restaurant Casa Tomás à Crevillente", description: "Découvrez Casa Tomás : notre histoire depuis 1998, nos racines galiciennes, notre cuisine méditerranéenne et nos espaces à Crevillente." },
  },
  "/contacto": {
    es: { h1: "Cómo llegar y horario de Casa Tomás", title: "Contacto y horarios | Casa Tomás Crevillente", description: "Encuentra Casa Tomás en Carrer Santa Maria de la Cabeza, 2, Crevillente. Consulta horarios, teléfono y cómo llegar al restaurante." },
    en: { h1: "How to find Casa Tomás and opening hours", title: "Contact and opening hours | Casa Tomás", description: "Find Casa Tomás at Carrer Santa Maria de la Cabeza, 2, Crevillente. See opening hours, phone number and directions to the restaurant." },
    fr: { h1: "Accès et horaires de Casa Tomás", title: "Contact et horaires | Casa Tomás", description: "Retrouvez Casa Tomás au Carrer Santa Maria de la Cabeza, 2, Crevillente. Consultez les horaires, le téléphone et l’itinéraire du restaurant." },
  },
  "/regala": {
    es: { h1: "Regala una comida en Casa Tomás", title: "Cheque regalo restaurante en Crevillente | Casa Tomás", description: "Regala una comida en Casa Tomás, Crevillente. Elige el importe de tu cheque regalo y personaliza la dedicatoria para una ocasión especial." },
    en: { h1: "Give a meal at Casa Tomás", title: "Restaurant gift voucher in Crevillente | Casa Tomás", description: "Give a meal at Casa Tomás in Crevillente. Choose your gift voucher amount and add a personal message for a special occasion." },
    fr: { h1: "Offrez un repas chez Casa Tomás", title: "Chèque cadeau restaurant à Crevillente | Casa Tomás", description: "Offrez un repas chez Casa Tomás à Crevillente. Choisissez le montant de votre chèque cadeau et ajoutez un message personnalisé." },
  },
  "/touza": {
    es: { h1: "Touza Cocktail Bar", title: "Touza Cocktail Bar | Casa Tomás", description: "Conoce Touza Cocktail Bar, el otro proyecto de los propietarios de Casa Tomás. Descubre su propuesta y accede a la web de Touza." },
    en: { h1: "Touza Cocktail Bar", title: "Touza Cocktail Bar | Casa Tomás", description: "Discover Touza Cocktail Bar, another project from the owners of Casa Tomás. Explore its offering and visit the Touza website." },
    fr: { h1: "Touza Cocktail Bar", title: "Touza Cocktail Bar | Casa Tomás", description: "Découvrez Touza Cocktail Bar, un autre projet des propriétaires de Casa Tomás. Retrouvez sa proposition et visitez le site de Touza." },
  },
} as const;

export type PaginaInformacion = keyof typeof PAGINAS_INFORMACION;
