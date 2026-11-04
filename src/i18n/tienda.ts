/**
 * Textos de la tienda de vinos (`/tienda`, `/en/tienda`, `/fr/tienda`): un
 * escaparate, sin compra por internet.
 *
 * Van aparte de `languages/{es,en,fr}.ts` a propósito: esos tres paquetes
 * entran en el arranque de TODAS las páginas, y estos textos solo los necesita
 * la ruta perezosa de la tienda. En los paquetes comunes solo está lo que sale
 * en todas partes: el enlace del menú (`header.nav.tienda`) y el del pie
 * (`footer.shopLink`).
 *
 * `{phone}` se sustituye por el teléfono pulsable del restaurante (`TelLink`).
 */
import type { Language } from "@/i18n/types";

export interface TextosTienda {
  seo: { title: string; description: string; keywords: string[] };
  miga: string;
  /** Banda de la maqueta (la tienda solo existe en la demo). */
  maqueta: { etiqueta: string; texto: string };
  titulo: string;
  subtitulo: string;
  detalle: (n: number) => string;
  ventajas: { restaurante: string; reserva: string };
  comprobando: string;
  cerrada: { titulo: string; texto: string; verCarta: string; llamar: string };
  edad: { titulo: string; texto: string };
  aviso: string;
  comprar: {
    titulo: string;
    intro: string;
    donde: string;
    comoLlegar: string;
    horario: string;
    telefono: string;
    llamar: string;
    pago: string;
    /** Precio de tienda solo para llevar; en mesa, el de la carta. */
    soloParaLlevar: { titulo: string; texto: string; verCarta: string };
  };
  listado: {
    titulo: string;
    buscar: string;
    vacio: string;
    limpiar: string;
    mostrarMas: (n: number) => string;
    resultados: (n: number) => string;
    filtroDenominacion: string;
    todos: string;
    final: string;
  };
  /** Prefijo del precio para el lector de pantalla («Precio: 31,50 €»). */
  tarjeta: { precio: string };
}

export const TEXTOS_TIENDA: Record<Language, TextosTienda> = {
  es: {
    seo: {
      title: "Tienda de vinos | Casa Tomás Crevillente",
      description:
        "Los vinos de la bodega de Casa Tomás para llevar a casa, con su precio. Se compran en el restaurante, en Crevillent: pásate o llámanos para reservarlos.",
      keywords: ["tienda de vinos Crevillent", "comprar vino Crevillente", "vinos Casa Tomás", "vino para llevar Alicante"],
    },
    miga: "Tienda",
    maqueta: { etiqueta: "Maqueta · solo en la demo", texto: "Esta página no está publicada en la web real." },
    titulo: "Tienda de vinos",
    subtitulo: "Los vinos de nuestra bodega, para llevártelos a casa.",
    detalle: (n) => (n === 1 ? "1 vino a la venta" : `${n} vinos a la venta`),
    ventajas: {
      restaurante: "Se compran en el restaurante",
      reserva: "Resérvalos por teléfono",
    },
    comprobando: "Cargando la tienda…",
    cerrada: {
      titulo: "La tienda no está disponible ahora",
      texto: "Ahora mismo no tenemos vinos a la venta para llevar. Vuelve pronto, o llámanos al {phone} y te ayudamos.",
      verCarta: "Ver la carta de vinos",
      llamar: "Llamar al restaurante",
    },
    edad: {
      titulo: "Venta solo a mayores de 18 años",
      texto: "La venta de bebidas alcohólicas a menores de 18 años está prohibida. Al comprar te podemos pedir un documento que acredite tu edad.",
    },
    aviso: "Aviso",
    comprar: {
      titulo: "Cómo comprar",
      intro: "Los vinos de la tienda se compran en el restaurante, para llevar: no vendemos por internet. Pásate por Casa Tomás o llámanos y te reservamos las botellas.",
      donde: "Dónde",
      comoLlegar: "Cómo llegar",
      horario: "Horario",
      telefono: "Teléfono",
      llamar: "Llamar para reservar botellas",
      pago: "Pagas en el restaurante, en efectivo o con tarjeta.",
      soloParaLlevar: {
        titulo: "Precio de tienda solo para llevar.",
        texto: "Si quieres tomar el vino en el restaurante, se cobra al precio de la carta.",
        verCarta: "Ver la carta de vinos",
      },
    },
    listado: {
      titulo: "Vinos a la venta",
      buscar: "Buscar vinos...",
      vacio: "No hay vinos que coincidan con tu búsqueda.",
      limpiar: "Ver todos los vinos",
      mostrarMas: (n) => `Mostrar más vinos (${n})`,
      resultados: (n) => (n === 1 ? "1 vino" : `${n} vinos`),
      filtroDenominacion: "Filtrar vinos por denominación",
      todos: "Todos",
      final: "¿Te llevas alguno? Pídelo en el restaurante o llámanos al {phone} y te lo reservamos.",
    },
    tarjeta: { precio: "Precio" },
  },
  en: {
    seo: {
      title: "Wine Shop | Casa Tomás Crevillente",
      description:
        "The wines from the Casa Tomás cellar to take home, with their prices. Buy them at the restaurant in Crevillent: drop by or call us to reserve them.",
      keywords: ["wine shop Crevillent", "buy wine Crevillente", "Casa Tomás wines", "wine to take away Alicante"],
    },
    miga: "Shop",
    maqueta: { etiqueta: "Mock-up · demo only", texto: "This page isn't published on the live website." },
    titulo: "Wine shop",
    subtitulo: "The wines from our cellar, to take home.",
    detalle: (n) => (n === 1 ? "1 wine for sale" : `${n} wines for sale`),
    ventajas: {
      restaurante: "Buy them at the restaurant",
      reserva: "Reserve them by phone",
    },
    comprobando: "Loading the shop…",
    cerrada: {
      titulo: "The shop isn't available right now",
      texto: "We don't have any wines for sale to take away right now. Please come back soon, or call us on {phone} and we'll help you.",
      verCarta: "See the wine list",
      llamar: "Call the restaurant",
    },
    edad: {
      titulo: "Sale to over-18s only",
      texto: "The sale of alcoholic drinks to anyone under 18 is prohibited. We may ask for ID showing your age when you buy.",
    },
    aviso: "Notice",
    comprar: {
      titulo: "How to buy",
      intro: "The wines in the shop are bought at the restaurant, to take away: we don't sell online. Drop by Casa Tomás or call us and we'll reserve the bottles for you.",
      donde: "Where",
      comoLlegar: "Directions",
      horario: "Opening hours",
      telefono: "Phone",
      llamar: "Call to reserve bottles",
      pago: "You pay at the restaurant, in cash or by card.",
      soloParaLlevar: {
        titulo: "Shop prices are for takeaway only.",
        texto: "If you'd like to drink the wine at the restaurant, the wine list price applies.",
        verCarta: "See the wine list",
      },
    },
    listado: {
      titulo: "Wines for sale",
      buscar: "Search wines...",
      vacio: "No wines match your search.",
      limpiar: "Show all wines",
      mostrarMas: (n) => `Show more wines (${n})`,
      resultados: (n) => (n === 1 ? "1 wine" : `${n} wines`),
      filtroDenominacion: "Filter wines by region",
      todos: "All",
      final: "Fancy one? Ask for it at the restaurant or call us on {phone} and we'll reserve it for you.",
    },
    tarjeta: { precio: "Price" },
  },
  fr: {
    seo: {
      title: "Boutique de vins | Casa Tomás Crevillente",
      description:
        "Les vins de la cave de Casa Tomás à emporter, avec leur prix. Ils s'achètent au restaurant, à Crevillent : passez nous voir ou appelez-nous pour les réserver.",
      keywords: ["boutique de vins Crevillent", "acheter du vin Crevillente", "vins Casa Tomás", "vin à emporter Alicante"],
    },
    miga: "Boutique",
    maqueta: { etiqueta: "Maquette · uniquement en démo", texto: "Cette page n'est pas publiée sur le site réel." },
    titulo: "Boutique de vins",
    subtitulo: "Les vins de notre cave, à emporter chez vous.",
    detalle: (n) => (n === 1 ? "1 vin en vente" : `${n} vins en vente`),
    ventajas: {
      restaurante: "En vente au restaurant",
      reserva: "Réservez-les par téléphone",
    },
    comprobando: "Chargement de la boutique…",
    cerrada: {
      titulo: "La boutique n'est pas disponible pour le moment",
      texto: "Nous n'avons pas de vins à emporter en vente pour le moment. Revenez bientôt, ou appelez-nous au {phone} et nous vous aiderons.",
      verCarta: "Voir la carte des vins",
      llamar: "Appeler le restaurant",
    },
    edad: {
      titulo: "Vente réservée aux plus de 18 ans",
      texto: "La vente de boissons alcoolisées aux mineurs de moins de 18 ans est interdite. Lors de l'achat, nous pouvons vous demander une pièce d'identité.",
    },
    aviso: "Information",
    comprar: {
      titulo: "Comment acheter",
      intro: "Les vins de la boutique s'achètent au restaurant, à emporter : nous ne vendons pas en ligne. Passez chez Casa Tomás ou appelez-nous et nous vous réservons les bouteilles.",
      donde: "Où",
      comoLlegar: "Itinéraire",
      horario: "Horaires",
      telefono: "Téléphone",
      llamar: "Appeler pour réserver des bouteilles",
      pago: "Vous payez au restaurant, en espèces ou par carte.",
      soloParaLlevar: {
        titulo: "Prix boutique uniquement à emporter.",
        texto: "Si vous souhaitez boire le vin au restaurant, c'est le prix de la carte qui s'applique.",
        verCarta: "Voir la carte des vins",
      },
    },
    listado: {
      titulo: "Vins en vente",
      buscar: "Rechercher des vins...",
      vacio: "Aucun vin ne correspond à votre recherche.",
      limpiar: "Voir tous les vins",
      mostrarMas: (n) => `Afficher plus de vins (${n})`,
      resultados: (n) => (n === 1 ? "1 vin" : `${n} vins`),
      filtroDenominacion: "Filtrer les vins par région",
      todos: "Tous",
      final: "Un vin vous tente ? Demandez-le au restaurant ou appelez-nous au {phone} et nous vous le réservons.",
    },
    tarjeta: { precio: "Prix" },
  },
};
