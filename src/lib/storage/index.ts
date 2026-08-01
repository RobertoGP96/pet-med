/**
 * Selector de driver de almacenamiento.
 *
 * El resto de la app importa únicamente `getStorage()`; qué driver hay detrás
 * lo decide la variable `STORAGE_DRIVER`.
 */

import { getServerEnv } from "@/lib/env";
import { localStorageDriver } from "./local";
import { supabaseStorageDriver } from "./supabase";
import type { StorageDriver } from "./types";

export type { StorageDriver, StoredFile } from "./types";

export function getStorage(): StorageDriver {
  return getServerEnv().storageDriver === "supabase"
    ? supabaseStorageDriver
    : localStorageDriver;
}
