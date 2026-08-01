/**
 * Tipos de la base de datos para @supabase/supabase-js v2.
 *
 * ESTE FICHERO SE MANTIENE A MANO. Todavía no existe un proyecto de Supabase
 * del que generarlo, así que se escribió reflejando columna a columna la
 * migración supabase/migrations/20260801120000_init.sql.
 *
 * En cuanto exista el proyecto, se puede regenerar con:
 *
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 *
 * DEBE MANTENERSE SINCRONIZADO CON LA MIGRACIÓN. Cualquier cambio de esquema
 * (columna nueva, nullabilidad, valor de enum) se refleja aquí en el mismo
 * commit; si no, el cliente tipado mentirá en tiempo de compilación.
 *
 * Convenciones:
 * - Las columnas van en snake_case, tal cual están en Postgres. La traducción
 *   al camelCase del dominio (src/domain/types.ts) vive en src/server/mappers.ts.
 * - `Row`: la fila tal como la devuelve un select. Las columnas nullables
 *   llevan `| null`.
 * - `Insert`: las columnas con valor por defecto o generadas son opcionales
 *   (`?`), igual que las nullables.
 * - `Update`: todo opcional.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      pets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          species: Database["public"]["Enums"]["species"];
          breed: string | null;
          breed_ref_id: string | null;
          size: Database["public"]["Enums"]["pet_size"] | null;
          sex: Database["public"]["Enums"]["sex"];
          birth_date: string | null;
          adoption_date: string | null;
          color: string | null;
          microchip: string | null;
          sterilized: boolean;
          bio: string | null;
          avatar_url: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          species: Database["public"]["Enums"]["species"];
          breed?: string | null;
          breed_ref_id?: string | null;
          size?: Database["public"]["Enums"]["pet_size"] | null;
          sex?: Database["public"]["Enums"]["sex"];
          birth_date?: string | null;
          adoption_date?: string | null;
          color?: string | null;
          microchip?: string | null;
          sterilized?: boolean;
          bio?: string | null;
          avatar_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          species?: Database["public"]["Enums"]["species"];
          breed?: string | null;
          breed_ref_id?: string | null;
          size?: Database["public"]["Enums"]["pet_size"] | null;
          sex?: Database["public"]["Enums"]["sex"];
          birth_date?: string | null;
          adoption_date?: string | null;
          color?: string | null;
          microchip?: string | null;
          sterilized?: boolean;
          bio?: string | null;
          avatar_url?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      weight_entries: {
        Row: {
          id: string;
          pet_id: string;
          measured_at: string;
          weight_kg: number;
          body_condition_score: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          measured_at: string;
          weight_kg: number;
          body_condition_score?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          measured_at?: string;
          weight_kg?: number;
          body_condition_score?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      conditions: {
        Row: {
          id: string;
          pet_id: string;
          name: string;
          category: Database["public"]["Enums"]["condition_category"];
          severity: Database["public"]["Enums"]["severity"];
          status: Database["public"]["Enums"]["condition_status"];
          diagnosed_at: string;
          resolved_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          name: string;
          category?: Database["public"]["Enums"]["condition_category"];
          severity?: Database["public"]["Enums"]["severity"];
          status?: Database["public"]["Enums"]["condition_status"];
          diagnosed_at: string;
          resolved_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          name?: string;
          category?: Database["public"]["Enums"]["condition_category"];
          severity?: Database["public"]["Enums"]["severity"];
          status?: Database["public"]["Enums"]["condition_status"];
          diagnosed_at?: string;
          resolved_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      medications: {
        Row: {
          id: string;
          pet_id: string;
          condition_id: string | null;
          name: string;
          dose: number;
          dose_unit: string;
          route: Database["public"]["Enums"]["medication_route"];
          interval_hours: number;
          start_date: string;
          end_date: string | null;
          instructions: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          condition_id?: string | null;
          name: string;
          dose: number;
          dose_unit: string;
          route?: Database["public"]["Enums"]["medication_route"];
          interval_hours: number;
          start_date: string;
          end_date?: string | null;
          instructions?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          condition_id?: string | null;
          name?: string;
          dose?: number;
          dose_unit?: string;
          route?: Database["public"]["Enums"]["medication_route"];
          interval_hours?: number;
          start_date?: string;
          end_date?: string | null;
          instructions?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      medication_doses: {
        Row: {
          id: string;
          medication_id: string;
          pet_id: string;
          scheduled_at: string;
          taken_at: string | null;
          status: Database["public"]["Enums"]["dose_status"];
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          medication_id: string;
          pet_id: string;
          scheduled_at: string;
          taken_at?: string | null;
          status?: Database["public"]["Enums"]["dose_status"];
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          medication_id?: string;
          pet_id?: string;
          scheduled_at?: string;
          taken_at?: string | null;
          status?: Database["public"]["Enums"]["dose_status"];
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      clinical_events: {
        Row: {
          id: string;
          pet_id: string;
          type: Database["public"]["Enums"]["clinical_event_type"];
          title: string;
          occurred_at: string;
          vet_name: string | null;
          clinic: string | null;
          description: string | null;
          next_due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          type?: Database["public"]["Enums"]["clinical_event_type"];
          title: string;
          occurred_at: string;
          vet_name?: string | null;
          clinic?: string | null;
          description?: string | null;
          next_due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          type?: Database["public"]["Enums"]["clinical_event_type"];
          title?: string;
          occurred_at?: string;
          vet_name?: string | null;
          clinic?: string | null;
          description?: string | null;
          next_due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      photos: {
        Row: {
          id: string;
          pet_id: string;
          url: string;
          caption: string | null;
          taken_at: string | null;
          is_cover: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          url: string;
          caption?: string | null;
          taken_at?: string | null;
          is_cover?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          url?: string;
          caption?: string | null;
          taken_at?: string | null;
          is_cover?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      reminders: {
        Row: {
          id: string;
          pet_id: string;
          type: Database["public"]["Enums"]["reminder_type"];
          title: string;
          due_at: string;
          recurrence: Database["public"]["Enums"]["recurrence"];
          medication_id: string | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          type?: Database["public"]["Enums"]["reminder_type"];
          title: string;
          due_at: string;
          recurrence?: Database["public"]["Enums"]["recurrence"];
          medication_id?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          type?: Database["public"]["Enums"]["reminder_type"];
          title?: string;
          due_at?: string;
          recurrence?: Database["public"]["Enums"]["recurrence"];
          medication_id?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      species: "dog" | "cat" | "rabbit" | "bird" | "rodent" | "reptile" | "other";
      sex: "male" | "female" | "unknown";
      pet_size: "small" | "medium" | "large" | "giant";
      condition_category:
        | "chronic"
        | "acute"
        | "allergy"
        | "injury"
        | "infection"
        | "parasite"
        | "dental"
        | "behavioral"
        | "other";
      condition_status: "active" | "in_treatment" | "controlled" | "resolved";
      severity: "mild" | "moderate" | "severe";
      medication_route:
        | "oral"
        | "topical"
        | "injection"
        | "ophthalmic"
        | "otic"
        | "inhaled"
        | "other";
      dose_status: "pending" | "taken" | "skipped" | "missed";
      clinical_event_type:
        | "visit"
        | "vaccine"
        | "deworming"
        | "surgery"
        | "lab"
        | "imaging"
        | "emergency"
        | "grooming"
        | "note";
      reminder_type: "medication" | "vaccine" | "deworming" | "checkup" | "birthday" | "custom";
      recurrence:
        | "none"
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "biannual"
        | "yearly";
    };
    CompositeTypes: Record<string, never>;
  };
}

// --- Atajos de conveniencia --------------------------------------------------

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
