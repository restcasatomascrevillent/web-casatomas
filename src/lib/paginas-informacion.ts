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
    es: {
      h1: "Touza Cocktail Bar en Crevillente",
      title: "Touza Cocktail Bar en Crevillente | Casa Tomás",
      description: "Touza Crevillente: la coctelería de Casa Tomás, con cócteles clásicos y de autor, cócteles sin alcohol, tapas de la casa y un reservado para celebraciones.",
      parrafos: [
        "Touza es la coctelería de Casa Tomás en Crevillente. Nace de las raíces gallegas de la casa y del carácter mediterráneo de la tierra que nos acoge, y esa mezcla de Atlántico y Mediterráneo es la que encontrarás en su carta de cócteles.",
        "Además de clásicos como el Margarita, el Negroni o el Mojito, en Touza preparamos creaciones propias que solo puedes probar aquí, y también cócteles sin alcohol. Para acompañarlos, puedes tapear con las tapas más emblemáticas de Casa Tomás.",
        "¿Tienes algo que celebrar? Touza dispone de un reservado exclusivo para disfrutar con los tuyos de un ambiente tranquilo y con más intimidad: para tu evento, el reservado de Touza es tu sitio.",
      ],
    },
    en: {
      h1: "Touza Cocktail Bar in Crevillente",
      title: "Touza Cocktail Bar in Crevillente | Casa Tomás",
      description: "Touza Crevillente: the cocktail bar of Casa Tomás, with classic and signature cocktails, alcohol-free cocktails, tapas from the house and a private room.",
      parrafos: [
        "Touza is the cocktail bar of Casa Tomás in Crevillente. It grows out of the Galician roots of the house and the Mediterranean character of the land that welcomes us, and that blend of Atlantic and Mediterranean is what you will find on its cocktail list.",
        "Alongside classics such as the Margarita, the Negroni or the Mojito, at Touza we make our own creations that you can only taste here, as well as alcohol-free cocktails. To go with them, you can enjoy the most emblematic tapas of Casa Tomás.",
        "Got something to celebrate? Touza has an exclusive private room where you can enjoy a quiet, more intimate atmosphere with your people: for your event, Touza's private room is the place.",
      ],
    },
    fr: {
      h1: "Touza Cocktail Bar à Crevillente",
      title: "Touza Cocktail Bar à Crevillente | Casa Tomás",
      description: "Touza Crevillente : le bar à cocktails de Casa Tomás, avec cocktails classiques et de création, cocktails sans alcool, tapas de la maison et un salon privé.",
      parrafos: [
        "Touza est le bar à cocktails de Casa Tomás à Crevillente. Il est né des racines galiciennes de la maison et du caractère méditerranéen de la terre qui nous accueille, et c'est ce mélange d'Atlantique et de Méditerranée que vous retrouverez sur sa carte de cocktails.",
        "En plus des classiques comme la Margarita, le Negroni ou le Mojito, nous préparons chez Touza des créations maison que vous ne goûterez qu'ici, ainsi que des cocktails sans alcool. Pour les accompagner, vous pouvez déguster les tapas les plus emblématiques de Casa Tomás.",
        "Vous avez quelque chose à fêter ? Touza dispose d'un salon privé exclusif pour profiter entre proches d'une ambiance calme et plus intime : pour votre événement, le salon privé de Touza est l'endroit idéal.",
      ],
    },
  },
} as const;

export type PaginaInformacion = keyof typeof PAGINAS_INFORMACION;
