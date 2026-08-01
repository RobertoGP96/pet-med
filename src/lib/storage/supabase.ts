/**
 * Driver de almacenamiento sobre Supabase Storage.
 *
 * Requiere un bucket público con el nombre de `STORAGE_BUCKET`. Crearlo desde
 * el panel de Supabase (Storage -> New bucket -> Public) o con:
 *   insert into storage.buckets (id, name, public)
 *   values ('pet-photos', 'pet-photos', true);
 */

import { randomUUID } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { getDb } from "@/lib/supabase/admin";
import { extensionForMimeType, type StorageDriver, type StoredFile } from "./types";

export const supabaseStorageDriver: StorageDriver = {
  name: "supabase",

  async upload(file: File, folder: string): Promise<StoredFile> {
    const { storageBucket } = getServerEnv();
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "misc";
    const key = `${safeFolder}/${randomUUID()}.${extensionForMimeType(file.type)}`;

    const storage = getDb().storage.from(storageBucket);

    const { error } = await storage.upload(key, file, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      throw new Error(`No se pudo subir la imagen: ${error.message}`);
    }

    const { data } = storage.getPublicUrl(key);
    return { url: data.publicUrl, key };
  },

  async remove(key: string): Promise<void> {
    const { storageBucket } = getServerEnv();
    await getDb().storage.from(storageBucket).remove([key]);
  },
};
