import bodegas from "./bodegas-verificadas.json";

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

export const nombreOrigen = (vino: OrigenVino) => {
  const bodega = bodegaVerificada(vino);
  return bodega ? `${bodega.nombre} · ${bodega.localidad}`
    : origenComprobable(vino.ubicacion_region)
      || origenComprobable(vino.denominacion_origen) || origenComprobable(vino.ubicacion_pais);
};

export const claveOrigen = (vino: OrigenVino) => {
  const bodega = bodegaVerificada(vino);
  return JSON.stringify(bodega
    ? ["bodega", bodega.nombre, bodega.coordenadas]
    : ["zona", normalizarOrigen(origenComprobable(vino.ubicacion_pais)), normalizarOrigen(nombreOrigen(vino))]);
};

export function coordenadasConocidas(vino: OrigenVino): [number, number] | null {
  const coords = bodegaVerificada(vino)?.coordenadas;
  if (!coords || coords.length !== 2 || !coords.every(Number.isFinite)
    || Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) return null;
  return [coords[0], coords[1]];
}

// El centro de una región o municipio no es una ubicación de bodega.
export async function localizarOrigen(vino: OrigenVino, _token: string, _signal: AbortSignal): Promise<[number, number] | null> {
  return coordenadasConocidas(vino);
}
