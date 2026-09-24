// Regenerates src/assets/logo/*.png from src/assets/logo-casa-tomas.png (800x550, black + alpha).
// 16-colour palette PNG: the logo is monochrome, so this beats AVIF/WebP on both size and fidelity.
const sharp=require('sharp');const fs=require('fs');
const path=require('path');const REPO=path.resolve(__dirname,'../..').split(path.sep).join('/');
const src=REPO+'/src/assets/logo-casa-tomas.png';const out=REPO+'/src/assets/logo';fs.mkdirSync(out,{recursive:true});
(async()=>{for(const w of [70,140,210,384,512,800]){await sharp(src).resize({width:w,kernel:'lanczos3'}).png({palette:true,colors:16,quality:90,dither:0,compressionLevel:9,effort:10}).toFile(`${out}/logo-casa-tomas-${w}.png`);const m=await sharp(`${out}/logo-casa-tomas-${w}.png`).metadata();console.log(w,m.width+'x'+m.height,fs.statSync(`${out}/logo-casa-tomas-${w}.png`).size)}})();
