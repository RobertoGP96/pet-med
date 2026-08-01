import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Habilita la integración de React <ViewTransition> con las navegaciones
    // del App Router. Ver src/app/globals.css para las animaciones.
    viewTransition: true,
  },
  images: {
    // Fotos servidas desde las APIs de razas y desde Supabase Storage.
    remotePatterns: [
      // Fotos de raza: dog.ceo (perros) y The Cat API (gatos).
      { protocol: "https", hostname: "images.dog.ceo" },
      { protocol: "https", hostname: "cdn2.thecatapi.com" },
      // Imágenes de relleno de supabase/seed.sql.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    // Next 16 restringe las calidades permitidas a [75] por defecto.
    qualities: [60, 75, 90],
  },
};

export default nextConfig;
