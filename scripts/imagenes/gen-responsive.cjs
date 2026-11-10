// Genera variantes AVIF/WebP (+1 JPG de respaldo) para las fotos de casa-tomas-story
// y recomprime public/og-image.jpg. Requiere `sharp` (devDependency del repo).
// Uso: node scripts/imagenes/gen-responsive.cjs
const sharp = require('sharp'); const fs = require('fs'); const path = require('path');
const R = path.resolve(__dirname, '../..').split(path.sep).join('/') + '/';
const OUT = R + 'src/assets/responsive/';
const JOBS = [
  // [nombre, fichero origen, anchos, ancho del JPG de respaldo]
  ['salon-1', 'src/assets/espacios/salon-1.jpg', [400, 640, 840, 1050], 840],
  ['salon-2', 'src/assets/espacios/salon-2.jpg', [480, 840, 1400], 840],
  ['salon-3', 'src/assets/espacios/salon-3.jpg', [400, 640, 840, 1050], 840],
  ['salon-4', 'src/assets/espacios/salon-4.jpg', [400, 640, 840, 1049], 840],
  ['salon-5', 'src/assets/espacios/salon-5.jpg', [400, 640, 840, 1050], 840],
  ['comedor-1', 'src/assets/espacios/comedor-1.jpg', [400, 640, 840, 1050], 840],
  ['comedor-2', 'src/assets/espacios/comedor-2.jpg', [400, 640, 840, 1050], 840],
  ['comedor-3', 'src/assets/espacios/comedor-3.jpg', [400, 640, 840, 1050], 840],
  ['carne-plato', 'src/assets/carne-plato.jpg', [480, 840, 1400], 840],
  ['champan', 'src/assets/champan.jpg', [400, 640, 934], 640],
  ['pulpo-plato', 'src/assets/pulpo-plato.jpg', [400, 500], 500],
  ['vinos-marques', 'src/assets/vinos-marqués.jpeg', [300], 300],
  ['lampara', 'src/assets/lampara.jpg', [480, 840, 1400], 840],
  // Touza: fotos del local de su propia web (touza-2/5/10 a 1600 px), para /touza.
  ['touza-interior', 'src/assets/touza/touza-interior.webp', [640, 1024, 1600], 1024],
  ['touza-coctel', 'src/assets/touza/touza-coctel.webp', [400, 640, 800], 640],
  ['touza-barra', 'src/assets/touza/touza-barra.webp', [400, 640, 800], 640],
];
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const manifest = {}; let total = 0;
  for (const [name, src, widths, fbw] of JOBS) {
    const meta = await sharp(R + src).metadata();
    manifest[name] = { width: meta.width, height: meta.height, widths, fallback: fbw };
    const sizes = [];
    for (const w of widths) {
      const base = sharp(R + src).rotate().resize({ width: w, withoutEnlargement: true });
      const a = await base.clone().avif({ quality: 55, effort: 6, chromaSubsampling: '4:2:0' }).toBuffer();
      const b = await base.clone().webp({ quality: 78, effort: 6 }).toBuffer();
      fs.writeFileSync(`${OUT}${name}-${w}w.avif`, a); fs.writeFileSync(`${OUT}${name}-${w}w.webp`, b);
      sizes.push(`${w}: avif ${(a.length / 1024).toFixed(0)}K webp ${(b.length / 1024).toFixed(0)}K`); total += a.length + b.length;
    }
    const j = await sharp(R + src).rotate().resize({ width: fbw, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    fs.writeFileSync(`${OUT}${name}-${fbw}w.jpg`, j); total += j.length;
    console.log(name.padEnd(14), `${meta.width}x${meta.height}`, sizes.join(' | '), `| jpg ${fbw} ${(j.length / 1024).toFixed(0)}K`);
  }
  fs.writeFileSync(OUT + 'manifest.ts',
    '// Generado con sharp (scripts/imagenes/gen-responsive.cjs). No editar a mano.\n' +
    '// Por foto: dimensiones del original, anchos generados (AVIF + WebP) y ancho del JPG de respaldo.\n' +
    'const manifest = ' + JSON.stringify(manifest, null, 2) + ' as const;\n\nexport default manifest;\n');
  console.log('total generated', (total / 1024).toFixed(0), 'KB');
  // og-image 1200x630 <= 80 KB
  for (let q = 82; q >= 50; q -= 2) {
    const buf = await sharp(R + 'src/assets/carne-plato.jpg').resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (buf.length <= 80 * 1024) { fs.writeFileSync(R + 'public/og-image.jpg', buf); console.log('og-image q', q, (buf.length / 1024).toFixed(1), 'KB'); break; }
  }
})();
