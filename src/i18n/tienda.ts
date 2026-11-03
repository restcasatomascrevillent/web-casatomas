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
  titulo: string;
  subtitulo: (descuento: string | null) => string;
  detalle: (n: number) => string;
  ventajas: { descuento: (descuento: string) => string; restaurante: string; reserva: string };
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
  tarjeta: { precioCarta: string; precioTienda: string; descuento: (descuento: string) => string };
}

export const TEXTOS_TIENDA: Record<Language, TextosTienda> = {
  es: {
    seo: {
      title: "Tienda de vinos | Casa Tomás Crevillente",
      description:
        "Los vinos de la bodega de Casa Tomás para llevar a casa, con descuento sobre el precio de carta. Se compran en el restaurante, en Crevillent: pásate o llámanos para reservarlos.",
      keywords: ["tienda de vinos Crevillent", "comprar vino Crevillente", "vinos Casa Tomás", "vino para llevar Alicante"],
    },
    miga: "Tienda",
    titulo: "Tienda de vinos",
    subtitulo: (d) =>
      d
        ? `Los vinos de nuestra bodega, para llevártelos a casa con un ${d} de descuento sobre el precio de carta.`
        : "Los vinos de nuestra bodega, para llevártelos a casa.",
    detalle: (n) => (n === 1 ? "1 vino a la venta" : `${n} vinos a la venta`),
    ventajas: {
      descuento: (d) => `-${d} sobre precio de carta`,
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
    tarjeta: { precioCarta: "Precio en carta", precioTienda: "Precio tienda", descuento: (d) => `${d} de descuento` },
  },
  en: {
    seo: {
      title: "Wine Shop | Casa Tomás Crevillente",
      description:
        "The wines from the Casa Tomás cellar to take home, at a discount on the wine-list price. Buy them at the restaurant in Crevillent: drop by or call us to reserve them.",
      keywords: ["wine shop Crevillent", "buy wine Crevillente", "Casa Tomás wines", "wine to take away Alicante"],
    },
    miga: "Shop",
    titulo: "Wine shop",
    subtitulo: (d) =>
      d ? `The wines from our cellar, to take home with ${d} off the wine-list price.` : "The wines from our cellar, to take home.",
    detalle: (n) => (n === 1 ? "1 wine for sale" : `${n} wines for sale`),
    ventajas: {
      descuento: (d) => `${d} off the wine-list price`,
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
    tarjeta: { precioCarta: "Wine-list price", precioTienda: "Shop price", descuento: (d) => `${d} off` },
  },
  fr: {
    seo: {
      title: "Boutique de vins | Casa Tomás Crevillente",
      description:
        "Les vins de la cave de Casa Tomás à emporter, avec une remise sur le prix de la carte. Ils s'achètent au restaurant, à Crevillent : passez nous voir ou appelez-nous pour les réserver.",
      keywords: ["boutique de vins Crevillent", "acheter du vin Crevillente", "vins Casa Tomás", "vin à emporter Alicante"],
    },
    miga: "Boutique",
    titulo: "Boutique de vins",
    subtitulo: (d) =>
      d
        ? `Les vins de notre cave, à emporter chez vous avec ${d} de remise sur le prix de la carte.`
        : "Les vins de notre cave, à emporter chez vous.",
    detalle: (n) => (n === 1 ? "1 vin en vente" : `${n} vins en vente`),
    ventajas: {
      descuento: (d) => `-${d} sur le prix de la carte`,
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
    tarjeta: { precioCarta: "Prix carte", precioTienda: "Prix boutique", descuento: (d) => `${d} de remise` },
  },
};
