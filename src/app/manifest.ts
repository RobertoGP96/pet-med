import type { MetadataRoute } from "next";

/**
 * Manifiesto de aplicación web.
 *
 * Es lo que usa Android —y Chrome en escritorio— cuando alguien instala la
 * página como aplicación: de aquí saca el nombre, los colores de la ventana y
 * los iconos. El `icon.svg` y el `apple-icon.png` de `src/app/` cubren la
 * pestaña del navegador y iOS; esto cubre el tercer caso.
 *
 * Los PNG los genera `scripts/generate-icons.mjs` a partir del logotipo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pet Med · Historial médico de tus mascotas",
    short_name: "Pet Med",
    description:
      "Peso, padecimientos, medicación, vacunas, fotos y recordatorios de tus mascotas, con indicadores de salud calculados a partir de lo que registras.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#f3f2f2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // El «maskable» lleva más margen: Android lo recorta con la forma que
      // toque en cada lanzador, y sin ese aire se comería los dedos de la
      // huella. Ver el comentario de `padding` en el generador.
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
