import { ImageResponse } from "next/og";

/**
 * Imagen de vista previa al compartir un enlace.
 *
 * Se genera con `ImageResponse`, que por debajo es Satori: sólo entiende
 * flexbox y un puñado de propiedades CSS. Nada de `display: grid`, nada de
 * variables CSS —fuera de la página no existen—, así que los tres colores de la
 * identidad van literales: papel #f3f2f2, tinta #201e1d y rojo #ec3013.
 *
 * La huella no se dibuja aquí: Satori sólo cubre parte de SVG y no compensa
 * arriesgarse por un adorno. El cuadrado rojo ya identifica a la marca.
 */

export const alt = "Pet Med · Historial médico de tus mascotas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#201e1d",
          color: "#f3f2f2",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#ec3013" }} />
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 4 }}>PET MED</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 82, fontWeight: 800, lineHeight: 1.05 }}>
            Cada mascota tiene su historial.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a3a09e" }}>
            Peso, padecimientos, medicación, vacunas y recordatorios.
          </div>
        </div>

        {/* Filete rojo al pie: el mismo recurso que marca la pestaña activa. */}
        <div style={{ display: "flex", width: 200, height: 8, backgroundColor: "#ec3013" }} />
      </div>
    ),
    size,
  );
}
