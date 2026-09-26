/**
 * QR del ticket de "Mi mesa". `qrcode-generator` (MIT, sin dependencias,
 * ~8 KB gzip) se importa de forma dinámica: solo se descarga cuando alguien
 * genera la imagen del ticket, nunca en el bundle inicial.
 *
 * Devuelve la matriz de módulos; el SVG lo pinta `TicketMesa` (nítido a
 * cualquier `pixelRatio`, sin GIF ni canvas).
 */
export const generarMatrizQr = async (texto: string): Promise<boolean[][]> => {
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, fila) => Array.from({ length: n }, (_, col) => qr.isDark(fila, col)));
};

/** Un único `path` con un cuadrado por módulo oscuro (más ligero que N `rect`). */
export const pathDeMatrizQr = (matriz: boolean[][]): string => {
  let d = "";
  matriz.forEach((fila, y) => {
    fila.forEach((oscuro, x) => {
      if (oscuro) d += `M${x} ${y}h1v1h-1z`;
    });
  });
  return d;
};
