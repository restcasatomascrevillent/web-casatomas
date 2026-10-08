export interface OrigenVino {
  ubicacion_region?: string | null;
  ubicacion_pais?: string | null;
  denominacion_origen?: string | null;
}

export const normalizarOrigen = (valor: string) => valor.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[‐‑–—]/g, "-").trim().toLowerCase().replace(/\s+/g, " ");

// Coordenadas aproximadas de las regiones
const regionCoordinates: { [key: string]: [number, number] } = {
  // Francia
  "Champagne (Grand Est)": [4.0, 49.0],
  "Borgoña (Bourgogne-Franche-Comté)": [4.85, 47.0],
  "Borgoña (Yonne)": [3.6, 47.8],
  "Borgoña (estimado)": [4.85, 47.0],
  "Valle del Loira (Pays de la Loire)": [-0.5, 47.5],
  "Valle del Loira (Indre‑et‑Loire)": [0.7, 47.3],
  "Valle del Loira (Nièvre)": [3.5, 47.0],
  "Burdeos (Nouvelle-Aquitaine)": [-0.5, 44.8],
  "Burdeos (Pauillac)": [-0.75, 45.2],
  "Valle del Ródano (Auvergne-Rhône-Alpes)": [4.8, 45.0],
  "Valle del Ródano Septentrional (Drôme/Ardèche)": [4.8, 45.1],
  "Alsacia (Grand Est)": [7.5, 48.3],
  "Alsacia (Haut‑Rhin)": [7.3, 48.0],
  "Languedoc-Rosellón (Occitanie)": [3.0, 43.5],
  "Provenza (Provence-Alpes-Côte d'Azur)": [6.0, 43.5],
  "Mosela": [7.06, 49.95],
  
  // España - Galicia
  "Galicia (Pontevedra)": [-8.6, 42.4],
  "Galicia (Valdeorras, Ourense)": [-7.0, 42.4],
  "Galicia (Ourense)": [-7.9, 42.3],
  "Galicia (Ribeira Sacra – Lugo)": [-7.5, 42.5],
  
  // España - Castilla y León
  "Castilla y León": [-4.5, 41.8],
  "Castilla y León (Valladolid/Segovia)": [-4.7, 41.4],
  "Castilla y León (Segovia)": [-4.1, 41.0],
  "Castilla y León (El Bierzo, León)": [-6.6, 42.6],
  "Castilla y León (Valladolid)": [-4.7, 41.65],
  "Castilla y León (Zamora)": [-5.75, 41.5],
  
  // España - La Rioja y País Vasco
  "La Rioja": [-2.5, 42.3],
  "País Vasco (Rioja Alavesa, Álava)": [-2.7, 42.5],
  
  // España - Navarra
  "Navarra": [-1.65, 42.7],
  "Navarra)": [-1.65, 42.7],
  "Navarra (Vino de Pago Otazu)": [-1.65, 42.7],
  
  // España - Cataluña
  "Cataluña (Barcelona)": [2.15, 41.4],
  "Cataluña (Penedès)": [1.5, 41.3],
  "Cataluña (Priorat, Tarragona)": [0.7, 41.2],
  
  // España - Comunidad Valenciana
  "Comunidad Valenciana (Alicante)": [-0.5, 38.3],
  "Comunidad Valenciana (Valencia)": [-0.4, 39.5],
  
  // España - Región de Murcia
  "Región de Murcia (Jumilla)": [-1.3, 38.5],
  
  // España - Castilla-La Mancha
  "Castilla‑La Mancha (Albacete)": [-1.85, 39.0],
  "Castilla‑La Mancha (Ciudad Real)": [-3.9, 38.9],
  
  // España - Islas Canarias
  "Islas Canarias (Lanzarote)": [-13.6, 29.0],
  
  // España - Andalucía
  "Andalucía (Jerez, Cádiz)": [-6.0, 36.7],
  "Andalucía (Málaga)": [-4.4, 36.7],
  
  // Italia
  "Toscana": [11.2, 43.3],
  "Piamonte": [8.0, 45.0],
  "Veneto": [11.5, 45.5],
  "Sicilia": [14.0, 37.5],
  "Lombardía (Franciacorta)": [10.1, 45.6],
  
  // Portugal
  "Valle del Duero (Norte de Portugal)": [-7.8, 41.2],
  "Alentejo": [-7.9, 38.5],
  "Norte (Vinho Verde)": [-8.5, 41.5],
  "Lisboa (Alenquer)": [-9.0, 39.1],
  
  // Alemania
  "Rheingau": [8.0, 50.0],
  "Baden": [7.8, 48.5],
  
  // Estados Unidos
  "Valle de Napa (California)": [-122.3, 38.5],
  "Valle de Sonoma (California)": [-122.8, 38.4],
  "California (Paso Robles)": [-120.7, 35.6],
  
  // Argentina
  "Mendoza": [-69.0, -33.0],
  
  // Chile
  "Valle de Maipo (Región Metropolitana)": [-70.7, -33.5],
  "Valle de Colchagua (Región de O'Higgins)": [-71.0, -34.6],
  
  // Australia
  "Barossa Valley (Australia del Sur)": [139.0, -34.5],
  
  // Nueva Zelanda
  "Marlborough (Isla Sur)": [173.8, -41.5],
  
  // Sudáfrica
  "Stellenbosch (Provincia Occidental del Cabo)": [18.9, -33.9],
  "Western Cape (Elgin)": [19.0, -34.2],
};

const paisPorRegion: Record<string, string> = {
  "Champagne (Grand Est)": "Francia",
  "Borgoña (Bourgogne-Franche-Comté)": "Francia",
  "Borgoña (Yonne)": "Francia",
  "Borgoña (estimado)": "Francia",
  "Valle del Loira (Pays de la Loire)": "Francia",
  "Valle del Loira (Indre‑et‑Loire)": "Francia",
  "Valle del Loira (Nièvre)": "Francia",
  "Burdeos (Nouvelle-Aquitaine)": "Francia",
  "Burdeos (Pauillac)": "Francia",
  "Valle del Ródano (Auvergne-Rhône-Alpes)": "Francia",
  "Valle del Ródano Septentrional (Drôme/Ardèche)": "Francia",
  "Alsacia (Grand Est)": "Francia",
  "Alsacia (Haut‑Rhin)": "Francia",
  "Languedoc-Rosellón (Occitanie)": "Francia",
  "Provenza (Provence-Alpes-Côte d'Azur)": "Francia",
  "Mosela": "Alemania",
  "Galicia (Pontevedra)": "España",
  "Galicia (Valdeorras, Ourense)": "España",
  "Galicia (Ourense)": "España",
  "Galicia (Ribeira Sacra – Lugo)": "España",
  "Castilla y León": "España",
  "Castilla y León (Valladolid/Segovia)": "España",
  "Castilla y León (Segovia)": "España",
  "Castilla y León (El Bierzo, León)": "España",
  "Castilla y León (Valladolid)": "España",
  "Castilla y León (Zamora)": "España",
  "La Rioja": "España",
  "País Vasco (Rioja Alavesa, Álava)": "España",
  "Navarra": "España",
  "Navarra)": "España",
  "Navarra (Vino de Pago Otazu)": "España",
  "Cataluña (Barcelona)": "España",
  "Cataluña (Penedès)": "España",
  "Cataluña (Priorat, Tarragona)": "España",
  "Comunidad Valenciana (Alicante)": "España",
  "Comunidad Valenciana (Valencia)": "España",
  "Región de Murcia (Jumilla)": "España",
  "Castilla‑La Mancha (Albacete)": "España",
  "Castilla‑La Mancha (Ciudad Real)": "España",
  "Islas Canarias (Lanzarote)": "España",
  "Andalucía (Jerez, Cádiz)": "España",
  "Andalucía (Málaga)": "España",
  "Toscana": "Italia",
  "Piamonte": "Italia",
  "Veneto": "Italia",
  "Sicilia": "Italia",
  "Lombardía (Franciacorta)": "Italia",
  "Valle del Duero (Norte de Portugal)": "Portugal",
  "Alentejo": "Portugal",
  "Norte (Vinho Verde)": "Portugal",
  "Lisboa (Alenquer)": "Portugal",
  "Rheingau": "Alemania",
  "Baden": "Alemania",
  "Valle de Napa (California)": "Estados Unidos",
  "Valle de Sonoma (California)": "Estados Unidos",
  "California (Paso Robles)": "Estados Unidos",
  "Mendoza": "Argentina",
  "Valle de Maipo (Región Metropolitana)": "Chile",
  "Valle de Colchagua (Región de O'Higgins)": "Chile",
  "Barossa Valley (Australia del Sur)": "Australia",
  "Marlborough (Isla Sur)": "Nueva Zelanda",
  "Stellenbosch (Provincia Occidental del Cabo)": "Sudáfrica",
  "Western Cape (Elgin)": "Sudáfrica"
};

const codigosPais: Record<string, string> = {
  espana: "es", spain: "es", france: "fr", francia: "fr", italia: "it", italy: "it",
  portugal: "pt", alemania: "de", germany: "de", "estados unidos": "us", "united states": "us",
  argentina: "ar", chile: "cl", australia: "au", "nueva zelanda": "nz", "new zealand": "nz",
  sudafrica: "za", "south africa": "za",
};

// Puntos representativos de zonas vinícolas, no coordenadas de cada bodega.
// No inferir Cava desde la D.O.: se produce en varias comunidades autónomas.
type Zona = { nombre: string; pais: string; coords: [number, number]; denominaciones?: string[]; regiones?: string[] };
const zonas: Zona[] = [
  { nombre: "La Rioja", pais: "es", coords: [-2.5, 42.3], denominaciones: ["Rioja"] },
  { nombre: "Ribera del Duero", pais: "es", coords: [-3.69, 41.67], denominaciones: ["Ribera del Duero"] },
  { nombre: "Rueda", pais: "es", coords: [-4.96, 41.41], denominaciones: ["Rueda"] },
  { nombre: "Toro", pais: "es", coords: [-5.4, 41.52], denominaciones: ["Toro"] },
  { nombre: "Ribeiro", pais: "es", coords: [-8.14, 42.29], denominaciones: ["Ribeiro"] },
  { nombre: "Ribeira Sacra", pais: "es", coords: [-7.48, 42.47], denominaciones: ["Ribeira Sacra"] },
  { nombre: "Valdeorras", pais: "es", coords: [-6.98, 42.42], denominaciones: ["Valdeorras"] },
  { nombre: "Bierzo", pais: "es", coords: [-6.73, 42.61], denominaciones: ["Bierzo"] },
  { nombre: "Rías Baixas", pais: "es", coords: [-8.78, 42.51], denominaciones: ["Rías Baixas"] },
  { nombre: "Priorat", pais: "es", coords: [0.79, 41.19], denominaciones: ["Priorat"] },
  { nombre: "Jumilla", pais: "es", coords: [-1.33, 38.48], denominaciones: ["Jumilla"] },
  { nombre: "Valdepeñas", pais: "es", coords: [-3.38, 38.76], denominaciones: ["Valdepeñas"] },
  { nombre: "Almansa", pais: "es", coords: [-1.1, 38.87], denominaciones: ["Almansa"] },
  { nombre: "Jerez", pais: "es", coords: [-6.14, 36.69], denominaciones: ["Jerez-Xérès-Sherry"] },
  { nombre: "Abadía Retuerta", pais: "es", coords: [-4.43, 41.61], denominaciones: ["Vino de Pago Abadía Retuerta", "Vino de Pago Abadía Retuerta / IGP Castilla y León"] },
  { nombre: "Penedès", pais: "es", coords: [1.79, 41.43], regiones: ["Cataluña (Penedès, Barcelona)", "Cataluña (Penedès)"] },
  { nombre: "Alella", pais: "es", coords: [2.29, 41.5], regiones: ["Cataluña (Maresme, Barcelona)"] },
  { nombre: "Alpera (Albacete)", pais: "es", coords: [-1.23, 38.96], regiones: ["Castilla-La Mancha (Alpera, Albacete)"] },
  { nombre: "Sierra de Gredos (Ávila)", pais: "es", coords: [-4.67, 40.32], regiones: ["Castilla y León (Ávila)"] },
  { nombre: "Vinos de Madrid", pais: "es", coords: [-4.4, 40.32], denominaciones: ["Vinos de Madrid"] },
  { nombre: "Rioja Alavesa", pais: "es", coords: [-2.58, 42.55], regiones: ["País Vasco (Rioja Alavesa, Álava)", "La Rioja/Álava (Rioja Alavesa)"] },
  { nombre: "Saint-Émilion", pais: "fr", coords: [-0.16, 44.89], denominaciones: ["Saint-Émilion Grand Cru"] },
  { nombre: "Côtes de Provence", pais: "fr", coords: [6.24, 43.33], denominaciones: ["Côtes de Provence"] },
  { nombre: "Côtes du Rhône", pais: "fr", coords: [4.8, 44.15], denominaciones: ["Côtes du Rhône"] },
  { nombre: "Vouvray", pais: "fr", coords: [0.8, 47.42], denominaciones: ["Vouvray"] },
  { nombre: "Pouilly-Fumé", pais: "fr", coords: [2.96, 47.28], denominaciones: ["Pouilly-Fumé"] },
  { nombre: "Chablis", pais: "fr", coords: [3.8, 47.81], denominaciones: ["Chablis"] },
  { nombre: "Saumur (Loira)", pais: "fr", coords: [-0.07, 47.26], regiones: ["Valle del Loira (Saumur)"] },
  { nombre: "Mosela", pais: "de", coords: [7.06, 49.95], denominaciones: ["Mosel", "Mosela"], regiones: ["Mosela", "Mosel"] },
  { nombre: "Asti", pais: "it", coords: [8.21, 44.9], denominaciones: ["Moscato d'Asti"] },
  { nombre: "Tokaj", pais: "hu", coords: [21.4, 48.2], denominaciones: ["Tokaj"], regiones: ["Tokaj"] },
  { nombre: "Stellenbosch", pais: "za", coords: [18.85, -33.98], denominaciones: ["Stellenbosch"], regiones: ["Stellenbosch (Provincia Occidental del Cabo)"] },
];

const codigoPais = (pais: string) => {
  const key = normalizarOrigen(pais);
  return codigosPais[key] || ({ es: "es", fr: "fr", de: "de", it: "it", za: "za", hu: "hu", hungria: "hu", hungary: "hu", hongrie: "hu", espagne: "es", "afrique du sud": "za", allemagne: "de", italie: "it" } as Record<string, string>)[key];
};

const pendiente = (valor: string) => /por confirmar|sin especificar|desconocido|to be confirmed|a confirmer/i.test(normalizarOrigen(valor));
const limpio = (valor?: string | null) => valor && !pendiente(valor) ? valor.trim() : "";
const denominacion = (valor: string) => normalizarOrigen(valor)
  .replace(/^(d\.o\.(?:ca\.|q\.|p\.)?|aoc|aop|docg|wo)\s*/, "")
  .replace(/\s*\((estimado|segun carta)\)$/, "");

function zonaConocida(vino: OrigenVino): Zona | undefined {
  const pais = codigoPais(vino.ubicacion_pais || "");
  if (!pais) return undefined;
  const region = normalizarOrigen(limpio(vino.ubicacion_region));
  const origen = denominacion(limpio(vino.denominacion_origen));
  // Mantener las subzonas explícitas antes de recurrir a una D.O. más amplia.
  return zonas.find(z => z.pais === pais && z.regiones?.some(r => normalizarOrigen(r) === region))
    || zonas.find(z => z.pais === pais && z.denominaciones?.some(d => denominacion(d) === origen));
}

export const nombreOrigen = (vino: OrigenVino) => zonaConocida(vino)?.nombre
  || limpio(vino.ubicacion_region) || limpio(vino.denominacion_origen) || limpio(vino.ubicacion_pais);

export const claveOrigen = (vino: OrigenVino) => JSON.stringify([
  codigoPais(vino.ubicacion_pais || "") || normalizarOrigen(limpio(vino.ubicacion_pais)),
  normalizarOrigen(nombreOrigen(vino)),
]);

export function coordenadasConocidas(vino: OrigenVino): [number, number] | null {
  const zona = zonaConocida(vino);
  if (zona) return zona.coords;
  const region = normalizarOrigen(limpio(vino.ubicacion_region));
  const pais = normalizarOrigen(vino.ubicacion_pais || "");
  if (!region || /estimado/.test(region)) return null;
  const nombre = Object.keys(regionCoordinates).find(key =>
    normalizarOrigen(key) === region && (!pais || normalizarOrigen(paisPorRegion[key]) === pais
      || (codigoPais(pais) && codigoPais(pais) === codigoPais(paisPorRegion[key]))));
  return nombre ? regionCoordinates[nombre] : null;
}

// Solo resultados temporales, con país y topónimo comprobados. Nunca usar el
// centro del país como sustituto de una región que no se ha podido localizar.
export async function localizarOrigen(vino: OrigenVino, token: string, signal: AbortSignal): Promise<[number, number] | null> {
  const conocidas = coordenadasConocidas(vino);
  if (conocidas) return conocidas;
  const pais = limpio(vino.ubicacion_pais);
  const codigo = codigoPais(pais);
  const lugar = limpio(vino.ubicacion_region);
  if (!token || !codigo || !lugar || /estimado/i.test(lugar)) return null;
  const params = new URLSearchParams({
    q: `${lugar}, ${pais}`, country: codigo,
    access_token: token, limit: "5", autocomplete: "false", language: "es",
    types: "region,district,place,locality",
  });
  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { signal });
  if (!response.ok) return null;
  const result = await response.json();
  const features = Array.isArray(result.features) ? result.features : [];
  // Comprobar todo el topónimo: aceptar solo un nombre inequívoco y exacto.
  for (const feature of features) {
    const props = feature.properties;
    if (props?.context?.country?.country_code?.toLowerCase() !== codigo
      || !["region", "district", "place", "locality"].includes(props?.feature_type)
      || normalizarOrigen(props?.name || "") !== normalizarOrigen(lugar)) continue;
    const coords = feature.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length === 2 && coords.every(Number.isFinite)
      && Math.abs(coords[0]) <= 180 && Math.abs(coords[1]) <= 90) return coords as [number, number];
  }
  return null;
}
