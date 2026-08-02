/**
 * Genera los iconos PNG de la aplicación a partir del logotipo.
 *
 *   node scripts/generate-icons.mjs
 *
 * Se ejecuta a mano, sólo cuando cambia la marca; los PNG resultantes se
 * versionan. No está en `npm run build` a propósito: `sharp` no es una
 * dependencia declarada del proyecto, llega de rebote con Next, y un build no
 * debería depender de eso.
 *
 * ¿Por qué hacen falta PNG habiendo ya un `src/app/icon.svg`? Porque el SVG
 * sólo lo entienden los navegadores de escritorio modernos:
 *
 *   · iOS ignora los favicon SVG y pide `apple-icon.png` de 180×180.
 *   · Android instala la aplicación con los iconos del manifiesto, en PNG.
 *   · Los navegadores antiguos y algunos lectores de RSS piden un PNG normal.
 *
 * El dibujo es el mismo en todos: la huella `PawPrint` de lucide en rojo.
 *
 * Sobre el fondo. La marca no lleva ninguno —así está en la interfaz y en
 * `src/app/icon.svg`, que es transparente—, pero un icono de pantalla de inicio
 * no puede serlo: iOS rellena de negro cualquier `apple-icon` con
 * transparencia, y a Android le pasa lo propio con los «maskable». Por eso
 * estos PNG llevan el papel de la marca (#f3f2f2) detrás: es el color que ya
 * tendría debajo dentro de la aplicación, no un fondo nuevo.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const BRAND = "#ec3013";
const PAPER = "#f3f2f2";

/** Trazado de `paw-print` de lucide (ISC), en su lienzo original de 24. */
const PAW = `
  <circle cx="11" cy="4" r="2"/>
  <circle cx="18" cy="8" r="2"/>
  <circle cx="20" cy="16" r="2"/>
  <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>
`;

/**
 * Construye el SVG de un icono cuadrado.
 *
 * @param size    lado en píxeles
 * @param padding proporción del lado que queda como margen alrededor de la
 *                huella. En los iconos «maskable» de Android sube al 20 %:
 *                el sistema recorta el icono con la forma que quiera —círculo,
 *                cuadrado redondeado, gota— y sin ese margen se comería los
 *                dedos de la huella.
 * @param radius  radio de las esquinas, 0 para pleno. iOS aplica su propia
 *                máscara redondeada, así que `apple-icon` va a sangre.
 */
function iconSvg({ size, padding = 0.18, radius = 0, background = PAPER }) {
  const inner = size * (1 - padding * 2);
  const scale = inner / 24;
  const offset = size * padding;
  // El trazo de lucide es 2 sobre 24; al ampliar hay que dividirlo por la
  // escala o se convertiría en un borrón.
  const stroke = 2.4 / scale;

  const backdrop = background
    ? `<rect width="${size}" height="${size}"${radius ? ` rx="${radius}"` : ""} fill="${background}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${backdrop}
  <g transform="translate(${offset} ${offset}) scale(${scale})"
     fill="none" stroke="${BRAND}" stroke-width="${stroke}"
     stroke-linecap="round" stroke-linejoin="round">${PAW}</g>
</svg>`;
}

/** Dónde va cada tamaño y por qué. */
const TARGETS = [
  // Convenciones de archivo de Next: las detecta y añade las etiquetas <link>
  // sola, sin tocar el layout.
  //
  // `icon.png` es el respaldo de `icon.svg` para los navegadores que no
  // admiten favicon vectorial, así que va sin fondo como el original.
  { path: "src/app/icon.png", size: 192, background: null },
  { path: "src/app/apple-icon.png", size: 180, padding: 0.22 },
  // Referenciados desde src/app/manifest.ts.
  { path: "public/icons/icon-192.png", size: 192, radius: 30 },
  { path: "public/icons/icon-512.png", size: 512, radius: 80 },
  { path: "public/icons/maskable-512.png", size: 512, padding: 0.28 },
];

for (const { path, size, padding, radius, background } of TARGETS) {
  const file = join(root, path);
  await mkdir(dirname(file), { recursive: true });

  const png = await sharp(Buffer.from(iconSvg({ size, padding, radius, background })))
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(file, png);
  console.log(`✓ ${path} (${size}×${size}, ${(png.length / 1024).toFixed(1)} kB)`);
}
