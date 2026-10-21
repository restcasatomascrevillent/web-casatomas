export const PAGINAS_INFORMACION = {
  "/el-restaurante": {
    es: { title: "El restaurante Casa Tomás en Crevillente", description: "Conoce Casa Tomás: nuestra historia desde 1998, raíces gallegas, cocina mediterránea y espacios para disfrutar en Crevillente, Alicante." },
    en: { title: "About Casa Tomás restaurant in Crevillente", description: "Discover Casa Tomás: our history since 1998, Galician roots, Mediterranean cooking and dining spaces in Crevillente, Alicante." },
    fr: { title: "Le restaurant Casa Tomás à Crevillente", description: "Découvrez Casa Tomás : notre histoire depuis 1998, nos racines galiciennes, notre cuisine méditerranéenne et nos espaces à Crevillente." },
  },
  "/contacto": {
    es: { title: "Contacto y horarios | Casa Tomás Crevillente", description: "Encuentra Casa Tomás en Carrer Santa Maria de la Cabeza, 2, Crevillente. Consulta horarios, teléfono y cómo llegar al restaurante." },
    en: { title: "Contact and opening hours | Casa Tomás", description: "Find Casa Tomás at Carrer Santa Maria de la Cabeza, 2, Crevillente. See opening hours, phone number and directions to the restaurant." },
    fr: { title: "Contact et horaires | Casa Tomás", description: "Retrouvez Casa Tomás au Carrer Santa Maria de la Cabeza, 2, Crevillente. Consultez les horaires, le téléphone et l’itinéraire du restaurant." },
  },
  "/regala": {
    es: { title: "Regala una experiencia en Casa Tomás", description: "Regala una comida en Casa Tomás, Crevillente. Elige el importe de tu cheque regalo y personaliza la dedicatoria para una ocasión especial." },
    en: { title: "Give a Casa Tomás dining experience", description: "Give a meal at Casa Tomás in Crevillente. Choose your gift voucher amount and add a personal message for a special occasion." },
    fr: { title: "Offrez une expérience chez Casa Tomás", description: "Offrez un repas chez Casa Tomás à Crevillente. Choisissez le montant de votre chèque cadeau et ajoutez un message personnalisé." },
  },
  "/touza": {
    es: { title: "Touza Cocktail Bar | Casa Tomás", description: "Conoce Touza Cocktail Bar, el otro proyecto de los propietarios de Casa Tomás. Descubre su propuesta y accede a la web de Touza." },
    en: { title: "Touza Cocktail Bar | Casa Tomás", description: "Discover Touza Cocktail Bar, another project from the owners of Casa Tomás. Explore its offering and visit the Touza website." },
    fr: { title: "Touza Cocktail Bar | Casa Tomás", description: "Découvrez Touza Cocktail Bar, un autre projet des propriétaires de Casa Tomás. Retrouvez sa proposition et visitez le site de Touza." },
  },
} as const;

export type PaginaInformacion = keyof typeof PAGINAS_INFORMACION;
