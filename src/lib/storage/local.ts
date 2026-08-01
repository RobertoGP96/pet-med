/**
 * Driver de almacenamiento en disco: guarda en `public/uploads/`.
 *
 * Pensado para desarrollo y para despliegues con disco persistente (VPS,
 * Docker con volumen). NO funciona en plataformas serverless con sistema de
 * archivos de sólo lectura como Vercel: allí hay que poner
 * `STORAGE_DRIVER="supabase"`.
 */

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { extensionForMimeType, type StorageDriver, type StoredFile } from "./types";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_SEGMENT = "uploads";

export const localStorageDriver: StorageDriver = {
  name: "local",

  async upload(file: File, folder: string): Promise<StoredFile> {
    // `folder` viene de un id interno, pero se sanea igualmente para que no
    // pueda escaparse del directorio de subidas.
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
    const fileName = `${randomUUID()}.${extensionForMimeType(file.type)}`;

    const targetDir = path.join(PUBLIC_DIR, UPLOADS_SEGMENT, safeFolder);
    await mkdir(targetDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(targetDir, fileName), buffer);

    const key = `${safeFolder}/${fileName}`;
    return { url: `/${UPLOADS_SEGMENT}/${key}`, key };
  },

  async remove(key: string): Promise<void> {
    const normalized = key.replace(/^\/?uploads\//, "");
    const target = path.join(PUBLIC_DIR, UPLOADS_SEGMENT, normalized);

    // Defensa contra path traversal: el destino resuelto tiene que seguir
    // dentro de public/uploads.
    const uploadsRoot = path.join(PUBLIC_DIR, UPLOADS_SEGMENT);
    if (!path.resolve(target).startsWith(path.resolve(uploadsRoot))) return;

    try {
      await unlink(target);
    } catch {
      // Ya no existía: borrar es idempotente.
    }
  },
};
