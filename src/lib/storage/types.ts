/**
 * Contrato de almacenamiento de imágenes.
 *
 * La app nunca habla con el disco ni con un bucket directamente: pide un
 * driver a `getStorage()` y usa esta interfaz. Cambiar de local a Supabase
 * Storage (o mañana a S3/R2) es implementar esto y añadir una rama en
 * ./index.ts, sin tocar ni una server action.
 */

export interface StoredFile {
  /** URL utilizable en un <Image src>. */
  url: string;
  /** Ruta interna del driver, para poder borrar después. */
  key: string;
}

export interface StorageDriver {
  readonly name: "local" | "supabase";
  /** Sube un archivo y devuelve su URL pública. */
  upload(file: File, folder: string): Promise<StoredFile>;
  /** Borra un archivo previamente subido. No debe fallar si ya no existe. */
  remove(key: string): Promise<void>;
}

/** Extensión a partir del tipo MIME, para no confiar en el nombre del archivo. */
export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "bin";
  }
}
