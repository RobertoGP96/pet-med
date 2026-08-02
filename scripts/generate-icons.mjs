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
 * El dibujo es el mismo en todos y el mismo que `src/app/icon.svg`: cuadrado
 * rojo de esquinas redondeadas con la huella `PawPrint` de lucide calada en
 * papel.
 *
 * Sobre el fondo. Un icono de pantalla de inicio no puede ser transparente:
 * iOS rellena de negro cualquier `apple-icon` con transparencia, y a Android
 * le pasa lo propio con los «maskable». El cuadrado rojo resuelve eso y de
 * paso se reconoce igual sobre un fondo claro que sobre uno oscuro, que es
 * justo lo que no conseguía la huella suelta.
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
 * Grosor del trazo, en unidades del lienzo de 24 de lucide.
 *
 * Muy por encima del 2 de la librería: aquí la huella va calada sobre el rojo
 * y a tamaño de icono el trazo fino se deshace. A este grosor los dedos salen
 * casi macizos, que es como se leen a 32 px.
 */
const STROKE = 4;

/**
 * Caja que ocupa la huella —con el trazo de `STROKE` incluido— dentro del
 * lienzo de 24. El dibujo de lucide no está centrado en su propio lienzo, así
 * que encuadrar por el lienzo dejaba la huella descolgada hacia la esquina.
 * Las mismas constantes están en `src/app/icon.svg`; si cambia `STROKE` hay
 * que recalcularla, porque el trazo sobresale media anchura por cada lado.
 */
const PAW_BOX = { x: 1.55, y: 0, size: 22.6 };

/**
 * Construye el SVG de un icono cuadrado.
 *
 * @param size    lado en píxeles
 * @param padding proporción del lado que queda como margen alrededor de la
 *                huella. En los iconos «maskable» de Android sube bastante:
 *                el sistema recorta el icono con la forma que quiera —círculo,
 *                cuadrado redondeado, gota— y sin ese margen se comería los
 *                dedos de la huella.
 * @param radius  radio de las esquinas en proporción al lado, 0 para pleno.
 *                iOS y los lanzadores de Android aplican su propia máscara, así
 *                que `apple-icon` y el «maskable» van a sangre.
 */
function iconSvg({ size, padding = 0.17, radius = 0.22, background = BRAND }) {
  const inner = size * (1 - padding * 2);
  const scale = inner / PAW_BOX.size;
  // Encuadre: llevar la esquina de `PAW_BOX` al margen, no la del lienzo.
  const x = size * padding - PAW_BOX.x * scale;
  const y = size * padding - PAW_BOX.y * scale;

  const backdrop = background
    ? `<rect width="${size}" height="${size}"${radius ? ` rx="${size * radius}"` : ""} fill="${background}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${backdrop}
  <g transform="translate(${x} ${y}) scale(${scale})"
     fill="none" stroke="${PAPER}" stroke-width="${STROKE}"
     stroke-linecap="round" stroke-linejoin="round">${PAW}</g>
</svg>`;
}

/** Dónde va cada tamaño y por qué. */
const TARGETS = [
  // Convenciones de archivo de Next: las detecta y añade las etiquetas <link>
  // sola, sin tocar el layout.
  //
  // `icon.png` es el respaldo de `icon.svg` para los navegadores que no
  // admiten favicon vectorial: mismo cuadrado redondeado.
  { path: "src/app/icon.png", size: 192 },
  { path: "src/app/apple-icon.png", size: 180, padding: 0.2, radius: 0 },
  // Referenciados desde src/app/manifest.ts.
  { path: "public/icons/icon-192.png", size: 192 },
  { path: "public/icons/icon-512.png", size: 512 },
  { path: "public/icons/maskable-512.png", size: 512, padding: 0.28, radius: 0 },
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
