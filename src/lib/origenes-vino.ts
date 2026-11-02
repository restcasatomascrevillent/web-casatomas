import bodegas from "./bodegas-verificadas.json";
import zonasVino from "./zonas-vino.json";
import { denominacionConocida, esComunidadAutonoma, type DenominacionConocida } from "./denominaciones-vino";

export interface OrigenVino {
  id?: string;
  nombre?: string;
  ubicacion_region?: string | null;
  ubicacion_pais?: string | null;
  denominacion_origen?: string | null;
}

export const normalizarOrigen = (valor: string) => valor.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[‐‑–—]/g, "-").trim().toLowerCase().replace(/\s+/g, " ");

// Un dato no comprobado nunca se valida quitando su aviso.
export const origenComprobable = (valor?: string | null): string => {
  if (!valor || /estimad|aproximad|por confirmar|pendiente|sin especificar|desconocid|segun carta|to be confirmed|a confirmer/i.test(normalizarOrigen(valor))) return "";
  return valor.trim();
};

type BodegaVerificada = {
  nombreVino: string;
  denominacion: string;
  nombre: string;
  localidad: string;
  coordenadas: number[];
  fuente: string;
};

export function bodegaVerificada(vino: OrigenVino): BodegaVerificada | null {
  const registro = (bodegas as Record<string, BodegaVerificada>)[vino.id || ""];
  // No reutilizar el punto si el administrador cambia la identidad del vino.
  if (!registro || normalizarOrigen(origenComprobable(vino.ubicacion_pais)) !== "espana" || normalizarOrigen(vino.nombre || "") !== normalizarOrigen(registro.nombreVino)
    || normalizarOrigen(origenComprobable(vino.denominacion_origen)) !== normalizarOrigen(registro.denominacion)) return null;
  return registro;
}

// Región, y si no hay, denominación o país: el mismo orden que agrupa `claveOrigen`.
const textoZona = (vino: OrigenVino) =>
  origenComprobable(vino.ubicacion_region)
    || origenComprobable(vino.denominacion_origen) || origenComprobable(vino.ubicacion_pais);

export const nombreOrigen = (vino: OrigenVino) => {
  const bodega = bodegaVerificada(vino);
  return bodega ? `${bodega.nombre} · ${bodega.localidad}` : porDenominacion(vino)?.nombre ?? textoZona(vino);
};

type ZonaConocida = { coordenadas: number[]; fuente: string };

// Centro aproximado de una D.O./comarca/país, geocodificado y revisado una
// vez (ver docs/mapa-zonas-vino.md), no la ubicación exacta de una bodega.
// Nunca se recalcula en el navegador: solo lee este fichero ya guardado.
function zonaConocida(vino: OrigenVino): ZonaConocida | null {
  const pais = origenComprobable(vino.ubicacion_pais);
  const region = textoZona(vino);
  if (!pais || !region) return null;
  const clave = `${normalizarOrigen(pais)}|||${normalizarOrigen(region)}`;
  return (zonasVino as Record<string, ZonaConocida>)[clave] ?? null;
}

// Centro de la D.O. del vino (docs/mapa-zonas-vino.md), o null si la D.O. no
// está en `denominaciones-vino.json` o el país no coincide.
function denominacion(vino: OrigenVino): DenominacionConocida | null {
  const pais = origenComprobable(vino.ubicacion_pais);
  const nombre = origenComprobable(vino.denominacion_origen);
  return pais && nombre ? denominacionConocida(normalizarOrigen(pais), normalizarOrigen(nombre)) : null;
}

// Orden de precisión: bodega verificada > zona de la región > centro de la D.O.
// La D.O. solo pasa por delante de la región cuando esta no es una zona
// conocida (p. ej. «Galicia» + «D.O. Rías Baixas», o una localidad nueva) o es
// una comunidad autónoma (la D.O. concreta sitúa mejor el vino que «Castilla y León»).
function porDenominacion(vino: OrigenVino): DenominacionConocida | null {
  if (bodegaVerificada(vino)) return null;
  const den = denominacion(vino);
  if (!den) return null;
  const pais = normalizarOrigen(origenComprobable(vino.ubicacion_pais));
  const region = normalizarOrigen(origenComprobable(vino.ubicacion_region));
  return !zonaConocida(vino) || esComunidadAutonoma(pais, region) ? den : null;
}

export const claveOrigen = (vino: OrigenVino) => {
  const bodega = bodegaVerificada(vino);
  return JSON.stringify(bodega
    ? ["bodega", bodega.nombre, bodega.coordenadas]
    : ["zona", normalizarOrigen(origenComprobable(vino.ubicacion_pais)), normalizarOrigen(nombreOrigen(vino))]);
};

export function coordenadasConocidas(vino: OrigenVino): [number, number] | null {
  const coords = bodegaVerificada(vino)?.coordenadas ?? porDenominacion(vino)?.coordenadas ?? zonaConocida(vino)?.coordenadas;
  if (!coords || coords.length !== 2 || !coords.every(Number.isFinite)
    || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) return null;
  return [coords[0], coords[1]];
}

// El centro de una región o municipio no es una ubicación de bodega.
export async function localizarOrigen(vino: OrigenVino, _token: string, _signal: AbortSignal): Promise<[number, number] | null> {
  return coordenadasConocidas(vino);
}
