import type { Language } from "@/i18n/types";

/**
 * Title, H1, description e introducción propios de las categorías de la carta
 * que la gente busca por plato («chuletón Crevillente», «arroz con bogavante
 * en Crevillente», «pulpo a la gallega Crevillente»…). Plan SEO del 21/10/2026.
 *
 * ⚠️ Los textos nombran platos REALES de la carta del 21/10/2026 (nombres,
 * «madurada 60 días», «de la ría», «a la plancha con ajada»… tal como figuran
 * en `platos`). Si se da de baja un plato que aparece aquí, hay que quitarlo
 * también de su introducción. No hay precios, procedencias ni técnicas que no
 * estén en la carta.
 *
 * Van por slug, que no se traduce. Una categoría sin entrada (o renombrada)
 * cae al patrón genérico de `Categoria.tsx`.
 */
export interface SeoCategoria {
  title: string;
  h1: string;
  description: string;
  intro: string[];
}

export const SEO_CATEGORIA: Record<string, Record<Language, SeoCategoria>> = {
  carnes: {
    es: {
      title: "Chuletón y carnes a la brasa en Crevillente | Casa Tomás",
      h1: "Carnes en Crevillente: chuletón madurado 60 días y cochinillo",
      description:
        "Chuletón de vaca madurada 60 días, chuletón de ternera, cochinillo, solomillo gallego y pluma de bellota 5J en Casa Tomás, Crevillente. Precios y alérgenos.",
      intro: [
        "Si buscas dónde comer un buen chuletón en Crevillente, esta es la sección. La pieza estrella de Casa Tomás es el chuletón de vaca madurada 60 días, y a su lado servimos el chuletón de ternera y el entrecot de ternera nacional, que sacamos de nuestra propia selección de chuletones: los deshuesamos y aprovechamos las mejores piezas.",
        "Para quien prefiere una carne más tierna están el solomillo gallego, el solomillo trinchado salteado con ajetes y el solomillo de ternera con foie y salsa PX. Entre los asados, dos clásicos para compartir en la mesa: el cochinillo y la paletilla asada al estilo tradicional. Completa la sección la pluma de bellota 5J. Abajo tienes cada plato con su precio y sus alérgenos.",
      ],
    },
    en: {
      title: "Steak & Grilled Meat in Crevillente | Casa Tomás",
      h1: "Meat in Crevillente: 60-day aged T-bone steak and suckling pig",
      description:
        "60-day aged beef T-bone, veal T-bone, suckling pig, Galician sirloin and 5J acorn-fed pluma at Casa Tomás, Crevillente. Prices and allergens.",
      intro: [
        "Looking for a great steak in Crevillente? This is the place to start. The star cut at Casa Tomás is the T-bone steak (chuletón) from beef aged for 60 days, served alongside the veal T-bone and the Spanish veal entrecôte, which we take from our own selection of T-bones: we bone them and keep the best pieces.",
        "If you prefer a more tender cut, try the Galician sirloin, the carved sirloin sautéed with young garlic or the veal sirloin with foie and PX sauce. Among the roasts there are two classics for sharing: suckling pig and the traditionally roasted lamb shoulder. The 5J acorn-fed pluma, an Iberian pork cut, rounds off the section, so there is something for every kind of meat lover at the table. Every dish below shows its price and allergens.",
      ],
    },
    fr: {
      title: "Côte de bœuf et viandes à Crevillente | Casa Tomás",
      h1: "Viandes à Crevillente : côte de bœuf maturée 60 jours et cochon de lait",
      description:
        "Côte de bœuf maturée 60 jours, côte de veau, cochon de lait, filet galicien et pluma ibérique 5J chez Casa Tomás, à Crevillente. Prix et allergènes.",
      intro: [
        "Vous cherchez où manger une bonne côte de bœuf à Crevillente ? Vous êtes au bon endroit. La pièce phare de Casa Tomás est la côte de bœuf (chuletón) maturée 60 jours, servie avec la côte de veau et l'entrecôte de veau espagnol, que nous tirons de notre propre sélection de côtes : nous les désossons et gardons les meilleurs morceaux.",
        "Pour une viande plus tendre, il y a le filet galicien, le filet tranché sauté aux aillets et le filet de veau au foie gras et sauce PX. Côté rôtis, deux classiques à partager : le cochon de lait et l'épaule rôtie à l'ancienne. La pluma ibérique 5J complète la section. Chaque plat ci-dessous indique son prix et ses allergènes.",
      ],
    },
  },
  mariscos: {
    es: {
      title: "Marisquería en Crevillente: marisco gallego | Casa Tomás",
      h1: "Marisco gallego en Crevillente: percebes, nécoras y bogavante",
      description:
        "Percebes, nécoras, bogavante de la ría, langosta, almeja de Carril, ostras gallegas, zamburiñas y gamba roja en Casa Tomás, Crevillente. Precios y alérgenos.",
      intro: [
        "El marisco es el corazón de Casa Tomás, nuestra marisquería de cocina gallega en Crevillente. En esta sección encontrarás percebes, nécoras cocidas, santiaguiño gallego, buey de la ría, almeja de Carril, ostras gallegas, navajas, cañaíllas y mejillones al vapor.",
        "Entre los crustáceos está el bogavante de la ría, bogavante azul de la costa de Galicia que podemos preparar cocido o a la brasa, junto a la langosta, el carabinero, la cigala, la gamba roja, la gamba blanca, el langostino, el camarón y la quisquilla de la bahía. Las zamburiñas se hacen a la plancha con una ajada de aceite de oliva virgen extra por encima, y la ensaladilla de quisquilla llega con cocas de aceite. Cada plato aparece abajo con su precio y sus alérgenos.",
      ],
    },
    en: {
      title: "Galician Seafood in Crevillente | Casa Tomás",
      h1: "Galician seafood in Crevillente: goose barnacles, crabs and lobster",
      description:
        "Goose barnacles, velvet crabs, blue lobster, spiny lobster, Carril clams, Galician oysters and red prawns at Casa Tomás, Crevillente. Prices and allergens.",
      intro: [
        "Seafood is the heart of Casa Tomás, our Galician seafood restaurant in Crevillente. In this section you will find goose barnacles (percebes), boiled velvet crabs, Galician slipper lobster, brown crab from the ría, Carril clams, Galician oysters, razor clams, murex and steamed mussels, all of which go well with a white from our wine list.",
        "Among the crustaceans there is the blue lobster from the Galician coast, which we can boil or cook over the coals, together with spiny lobster, carabinero prawns, langoustines, red prawns, white prawns, king prawns, small shrimp and bay shrimp. The scallops (zamburiñas) are griddled and topped with a garlic and extra virgin olive oil dressing, and the shrimp salad comes with olive oil cocas. Every dish below shows its price and allergens.",
      ],
    },
    fr: {
      title: "Fruits de mer galiciens à Crevillente | Casa Tomás",
      h1: "Fruits de mer galiciens à Crevillente : pouces-pieds, étrilles et homard",
      description:
        "Pouces-pieds, étrilles, homard bleu, langouste, palourdes de Carril, huîtres galiciennes, pétoncles et crevettes rouges chez Casa Tomás, Crevillente.",
      intro: [
        "Les fruits de mer sont le cœur de Casa Tomás. Dans cette section vous trouverez des pouces-pieds (percebes), des étrilles cuites, de la cigale de mer galicienne, du tourteau de la ría, des palourdes de Carril, des huîtres galiciennes, des couteaux, des murex et des moules à la vapeur.",
        "Parmi les crustacés, le homard bleu de la côte galicienne, que nous pouvons préparer cuit ou à la braise, accompagne la langouste, le carabinero, la langoustine, la crevette rouge, la crevette blanche, la gambas, la crevette grise et la crevette de la baie. Les pétoncles (zamburiñas) sont cuits à la plancha avec une sauce à l'ail et à l'huile d'olive vierge extra, et la salade de crevettes est servie avec des cocas à l'huile. Chaque plat ci-dessous indique son prix et ses allergènes.",
      ],
    },
  },
  arroces: {
    es: {
      title: "Arroces en Crevillente: bogavante y langosta | Casa Tomás",
      h1: "Arroces melosos en Crevillente: bogavante, langosta y rape",
      description:
        "Arroz meloso de bogavante, de langosta, de rape y con rape y carabineros en Casa Tomás, Crevillente. Consulta precios y alérgenos y reserva tu mesa.",
      intro: [
        "Si te preguntas dónde comer arroz en Crevillente, en Casa Tomás todos nuestros arroces son melosos y de mar. El arroz meloso de bogavante y el arroz meloso de langosta son los más marineros de la carta; el arroz meloso de rape es la opción de pescado, y el arroz meloso con rape y carabineros reúne lo mejor de ambos.",
        "El bogavante y la langosta también los servimos solos en la sección de mariscos, y el rape, a la plancha o con ajetes tiernos, en la de pescados, por si alguien de la mesa prefiere otra cosa. Si buscáis arroz con bogavante en Crevillente, este es el nuestro. Abajo tienes cada arroz con su precio y sus alérgenos; para asegurarte mesa, sobre todo en fin de semana, te recomendamos reservar.",
      ],
    },
    en: {
      title: "Rice Dishes in Crevillente: Lobster Rice | Casa Tomás",
      h1: "Creamy rice dishes in Crevillente: lobster, spiny lobster and monkfish",
      description:
        "Creamy rice with blue lobster, with spiny lobster, with monkfish and with monkfish and carabinero prawns at Casa Tomás, Crevillente. Prices and allergens.",
      intro: [
        "Wondering where to eat rice in Crevillente? At Casa Tomás all our rice dishes are creamy (meloso) and seafood-based. The creamy rice with blue lobster and the creamy rice with spiny lobster are the most seafaring on the menu; the creamy monkfish rice is the fish option, and the creamy rice with monkfish and carabinero prawns brings the best of both together.",
        "Blue lobster and spiny lobster are also served on their own in the seafood section, and monkfish, griddled or with young garlic, in the fish section, in case someone at the table fancies something else. If you are after lobster rice in Crevillente, this is ours. Every rice dish below shows its price and allergens; we recommend booking, especially at weekends.",
      ],
    },
    fr: {
      title: "Riz à Crevillente : homard et langouste | Casa Tomás",
      h1: "Riz crémeux à Crevillente : homard, langouste et lotte",
      description:
        "Riz crémeux au homard, à la langouste, à la lotte et à la lotte et carabineros chez Casa Tomás, à Crevillente. Prix, allergènes et réservation.",
      intro: [
        "Vous cherchez où manger un bon riz à Crevillente ? Chez Casa Tomás, tous nos riz sont crémeux (melosos) et de la mer. Le riz crémeux au homard et le riz crémeux à la langouste sont les plus marins de la carte ; le riz crémeux à la lotte est l'option poisson, et le riz crémeux à la lotte et aux carabineros réunit le meilleur des deux.",
        "Le homard et la langouste sont aussi servis seuls dans la section fruits de mer, et la lotte, à la plancha ou aux aillets tendres, dans celle des poissons, si quelqu'un à table préfère autre chose. Chaque riz ci-dessous indique son prix et ses allergènes ; nous vous conseillons de réserver, surtout le week-end.",
      ],
    },
  },
  pescados: {
    es: {
      title: "Pescado salvaje y gallego en Crevillente | Casa Tomás",
      h1: "Pescado en Crevillente: rodaballo gallego, lenguado y lubina salvaje",
      description:
        "Rodaballo y salmonete gallegos, lenguado y lubina salvajes, rape, gallo pedro e ijada de atún en Casa Tomás, Crevillente. Precios y alérgenos de cada plato.",
      intro: [
        "Para quien viene a Casa Tomás a comer pescado en Crevillente, la carta reúne piezas gallegas y salvajes: rodaballo gallego, salmonete gallego, lenguado salvaje y lubina salvaje. El rape lo servimos de dos maneras, a la plancha o con ajetes tiernos.",
        "Completan la sección el gallo pedro, la escarapota, la palometa roja o virrey y la ijada de atún. Si te apetece más de un plato de mar, en la sección de mariscos tienes el bogavante de la ría y los percebes, y en la de arroces, el arroz meloso de rape. Y para abrir boca, en la sección de salazones están la mojama, el bonito en salazón y la hueva de atún de almadraba. Cada pescado aparece abajo con su precio y sus alérgenos.",
      ],
    },
    en: {
      title: "Wild & Galician Fish in Crevillente | Casa Tomás",
      h1: "Fish in Crevillente: Galician turbot, wild sole and wild sea bass",
      description:
        "Galician turbot and red mullet, wild sole and sea bass, monkfish, John Dory and tuna belly at Casa Tomás, Crevillente. Prices and allergens for each dish.",
      intro: [
        "If you come to Casa Tomás to eat fish in Crevillente, the menu brings together Galician and wild fish: Galician turbot, Galician red mullet, wild sole and wild sea bass. We serve monkfish two ways, griddled or with tender young garlic, for those who like it simple and for those who want more flavour.",
        "The section is rounded off by John Dory, scorpionfish (escarapota), red pomfret (palometa roja or virrey) and tuna belly (ijada). If you fancy more from the sea, the seafood section has blue lobster from the ría and goose barnacles, and the rice section has creamy monkfish rice. To whet your appetite, the salted fish section offers mojama, salted bonito and almadraba tuna roe. Every fish below shows its price and allergens.",
      ],
    },
    fr: {
      title: "Poisson sauvage et galicien à Crevillente | Casa Tomás",
      h1: "Poisson à Crevillente : turbot galicien, sole et bar sauvages",
      description:
        "Turbot et rouget galiciens, sole et bar sauvages, lotte, saint-pierre et ventrèche de thon chez Casa Tomás, à Crevillente. Prix et allergènes de chaque plat.",
      intro: [
        "Si vous venez chez Casa Tomás pour manger du poisson à Crevillente, la carte réunit des poissons galiciens et sauvages : turbot galicien, rouget galicien, sole sauvage et bar sauvage. La lotte est servie de deux façons, à la plancha ou aux aillets tendres.",
        "La section se complète avec le saint-pierre, la rascasse (escarapota), la grande castagnole (palometa roja ou virrey) et la ventrèche de thon (ijada). Pour plus de produits de la mer, la section fruits de mer propose le homard de la ría et les pouces-pieds, et celle des riz, le riz crémeux à la lotte. Pour ouvrir l'appétit, la section des salaisons propose la mojama, la bonite salée et les œufs de thon de madrague. Chaque poisson ci-dessous indique son prix et ses allergènes.",
      ],
    },
  },
  "entrantes-calientes": {
    es: {
      title: "Pulpo a la gallega y entrantes en Crevillente | Casa Tomás",
      h1: "Entrantes calientes: pulpo a la gallega, croquetas y calamares",
      description:
        "Pulpo a la gallega, a la parrilla de carbón o al horno, croquetas de jamón ibérico y de gamba roja, calamares y cocochas en Casa Tomás, Crevillente.",
      intro: [
        "El pulpo es uno de los platos que más asociamos con Galicia, y en Casa Tomás lo puedes pedir de cuatro formas: pulpo a la gallega, pulpo a la parrilla de carbón sobre fondo de tomate asado a las brasas, pulpo al horno estilo murciano y pulpo rebozado con mahonesa hoisin y salsa kimchi. Es una buena forma de empezar una comida en Crevillente con sabor gallego.",
        "Para compartir también hay croquetas de jamón ibérico, croqueta de gamba roja al ajillo y croqueta de carrillera ibérica, además de calamares encebollados al Albariño, calamar Bahía a la plancha y calamar rebozado. Completan la sección las cocochas de merluza al ajillo, las mollejas de cordero, las tortitas de camarón y el revuelto de alcachofas crujientes con queso parmesano. Cada plato aparece abajo con su precio y sus alérgenos.",
      ],
    },
    en: {
      title: "Galician Octopus & Starters in Crevillente | Casa Tomás",
      h1: "Hot starters: Galician-style octopus, croquettes and squid",
      description:
        "Galician-style octopus, charcoal-grilled or oven-baked octopus, Iberian ham and red prawn croquettes, squid and hake cocochas at Casa Tomás, Crevillente.",
      intro: [
        "Octopus is one of the dishes most associated with Galicia, and at Casa Tomás you can order it four ways: Galician-style octopus (pulpo a la gallega), charcoal-grilled octopus on a base of ember-roasted tomato, oven-baked octopus Murcia style, and battered octopus with hoisin mayonnaise and kimchi sauce. It is a good way to start a meal in Crevillente with a Galician flavour, and an easy dish to share at the centre of the table.",
        "For sharing there are Iberian ham croquettes, red prawn croquettes with garlic and Iberian pork cheek croquettes, as well as squid with onions in Albariño, griddled Bahía squid and battered squid. Hake cocochas with garlic, lamb sweetbreads, shrimp fritters and crispy artichoke scramble with parmesan round off the section. Every dish below shows its price and allergens.",
      ],
    },
    fr: {
      title: "Poulpe à la galicienne à Crevillente | Casa Tomás",
      h1: "Entrées chaudes : poulpe à la galicienne, croquettes et calamars",
      description:
        "Poulpe à la galicienne, grillé au charbon ou au four, croquettes de jambon ibérique et de crevette rouge, calamars et cocochas chez Casa Tomás, Crevillente.",
      intro: [
        "Le poulpe est l'un des plats que l'on associe le plus à la Galice, et chez Casa Tomás vous pouvez le commander de quatre façons : poulpe à la galicienne, poulpe grillé au charbon sur fond de tomate rôtie à la braise, poulpe au four à la mode de Murcie et poulpe en beignet avec mayonnaise hoisin et sauce kimchi. Une bonne façon de commencer un repas à Crevillente avec une saveur galicienne.",
        "À partager, il y a aussi des croquettes de jambon ibérique, de crevette rouge à l'ail et de joue de porc ibérique, ainsi que des calamars aux oignons à l'Albariño, des calamars Bahía à la plancha et des calamars frits. Les cocochas de merlu à l'ail, les ris d'agneau, les beignets de crevettes et les œufs brouillés aux artichauts croustillants et au parmesan complètent la section. Chaque plat ci-dessous indique son prix et ses allergènes.",
      ],
    },
  },
};

/** Enlaces de texto descriptivo a las especialidades (portada y /el-restaurante). */
export const ENLACES_ESPECIALIDADES: Record<
  Language,
  { antes: string; enlaces: { slug: string; texto: string }[]; separador: string; ultimo: string; despues: string }
> = {
  es: {
    antes: "Hoy, quien nos visita en Crevillente suele venir por ",
    enlaces: [
      { slug: "mariscos", texto: "el marisco gallego" },
      { slug: "carnes", texto: "el chuletón madurado y nuestras carnes" },
      { slug: "arroces", texto: "los arroces melosos de bogavante y langosta" },
      { slug: "pescados", texto: "el pescado salvaje" },
      { slug: "entrantes-calientes", texto: "el pulpo a la gallega" },
    ],
    separador: ", ",
    ultimo: " o ",
    despues: ".",
  },
  en: {
    antes: "Today, people who visit us in Crevillente usually come for ",
    enlaces: [
      { slug: "mariscos", texto: "Galician seafood" },
      { slug: "carnes", texto: "our aged T-bone steak and meat dishes" },
      { slug: "arroces", texto: "creamy lobster rice" },
      { slug: "pescados", texto: "wild fish" },
      { slug: "entrantes-calientes", texto: "Galician-style octopus" },
    ],
    separador: ", ",
    ultimo: " or ",
    despues: ".",
  },
  fr: {
    antes: "Aujourd'hui, ceux qui nous rendent visite à Crevillente viennent souvent pour ",
    enlaces: [
      { slug: "mariscos", texto: "les fruits de mer galiciens" },
      { slug: "carnes", texto: "la côte de bœuf maturée et nos viandes" },
      { slug: "arroces", texto: "les riz crémeux au homard et à la langouste" },
      { slug: "pescados", texto: "le poisson sauvage" },
      { slug: "entrantes-calientes", texto: "le poulpe à la galicienne" },
    ],
    separador: ", ",
    ultimo: " ou ",
    despues: ".",
  },
};
