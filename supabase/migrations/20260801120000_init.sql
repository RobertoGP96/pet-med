-- =============================================================================
-- Migración inicial de pet-med.
--
-- Contrato: este esquema es el reflejo exacto de src/domain/enums.ts y
-- src/domain/types.ts. Las columnas son el snake_case de los campos camelCase
-- del dominio (petId -> pet_id, weightKg -> weight_kg, ...). Si cambias algo
-- aquí, actualiza también src/lib/supabase/database.types.ts.
-- =============================================================================

-- --- Extensiones -------------------------------------------------------------

create extension if not exists "pgcrypto";

-- --- Tipos enumerados --------------------------------------------------------
-- Un tipo por cada enumeración persistida de src/domain/enums.ts.
-- HEALTH_LEVELS y LIFE_STAGES no aparecen: se derivan en tiempo de ejecución a
-- partir de la edad, la especie y el historial, nunca se guardan.

do $$ begin
  create type species as enum ('dog', 'cat', 'rabbit', 'bird', 'rodent', 'reptile', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type sex as enum ('male', 'female', 'unknown');
exception when duplicate_object then null;
end $$;

-- El dominio lo llama `Size`; el tipo se llama `pet_size` para no chocar con la
-- nomenclatura interna de Postgres. La columna sí se llama `size`.
do $$ begin
  create type pet_size as enum ('small', 'medium', 'large', 'giant');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type condition_category as enum (
    'chronic', 'acute', 'allergy', 'injury', 'infection',
    'parasite', 'dental', 'behavioral', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type condition_status as enum ('active', 'in_treatment', 'controlled', 'resolved');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type severity as enum ('mild', 'moderate', 'severe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type medication_route as enum (
    'oral', 'topical', 'injection', 'ophthalmic', 'otic', 'inhaled', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type dose_status as enum ('pending', 'taken', 'skipped', 'missed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type clinical_event_type as enum (
    'visit', 'vaccine', 'deworming', 'surgery', 'lab',
    'imaging', 'emergency', 'grooming', 'note'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reminder_type as enum (
    'medication', 'vaccine', 'deworming', 'checkup', 'birthday', 'custom'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type recurrence as enum (
    'none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'yearly'
  );
exception when duplicate_object then null;
end $$;

-- --- Función de marca de tiempo ----------------------------------------------
-- Una sola función para todos los disparadores `before update`.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function set_updated_at() is
  'Mantiene updated_at al día en cada UPDATE. Se engancha como trigger before update en todas las tablas que tienen esa columna.';

-- --- Tabla: pets -------------------------------------------------------------

create table if not exists pets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null,
  name          text not null,
  species       species not null,
  breed         text,
  breed_ref_id  text,
  size          pet_size,
  sex           sex not null default 'unknown',
  birth_date    date,
  adoption_date date,
  color         text,
  microchip     text,
  sterilized    boolean not null default false,
  bio           text,
  avatar_url    text,
  is_public     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table pets is 'Mascotas. Raíz de permisos: todas las tablas hijas cuelgan de pet_id.';
comment on column pets.owner_id is 'Persona propietaria. Cuando exista autenticación será auth.users.id; hoy no hay FK porque la app escribe con la service_role key y usuarios sembrados.';
comment on column pets.breed is 'Raza en texto libre, tal como la escribió la persona usuaria.';
comment on column pets.breed_ref_id is 'Id de la raza en The Dog API / The Cat API si se eligió del catálogo. Es texto, no uuid: son ids externos.';
comment on column pets.size is 'Tamaño de la raza (tipo pet_size). Determina a qué edad la mascota pasa a senior.';
comment on column pets.is_public is 'Si la mascota aparece en el mural público. Es la llave de la política de lectura anónima.';

-- --- Tabla: weight_entries ---------------------------------------------------
-- Registro de pesajes. Es inmutable por diseño: no tiene updated_at, un pesaje
-- equivocado se borra y se vuelve a crear.

create table if not exists weight_entries (
  id                   uuid primary key default gen_random_uuid(),
  pet_id               uuid not null references pets (id) on delete cascade,
  measured_at          date not null,
  weight_kg            numeric(6, 2) not null check (weight_kg > 0),
  body_condition_score smallint check (body_condition_score between 1 and 9),
  notes                text,
  created_at           timestamptz not null default now()
);

comment on table weight_entries is 'Pesajes. Sin updated_at: un registro erróneo se elimina, no se corrige.';
comment on column weight_entries.weight_kg is 'Peso en kilogramos, dos decimales. Siempre mayor que cero.';
comment on column weight_entries.body_condition_score is 'Body Condition Score veterinario, escala 1-9: 1 = caquéctico, 5 = peso ideal, 9 = obesidad severa.';

-- --- Tabla: conditions -------------------------------------------------------

create table if not exists conditions (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references pets (id) on delete cascade,
  name         text not null,
  category     condition_category not null default 'other',
  severity     severity not null default 'mild',
  status       condition_status not null default 'active',
  diagnosed_at date not null,
  resolved_at  date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint conditions_resolved_after_diagnosed
    check (resolved_at is null or resolved_at >= diagnosed_at)
);

comment on table conditions is 'Padecimientos diagnosticados a una mascota.';
comment on column conditions.resolved_at is 'Fecha de alta del padecimiento. Nunca anterior a diagnosed_at.';

-- --- Tabla: medications ------------------------------------------------------

create table if not exists medications (
  id             uuid primary key default gen_random_uuid(),
  pet_id         uuid not null references pets (id) on delete cascade,
  condition_id   uuid references conditions (id) on delete set null,
  name           text not null,
  dose           numeric(10, 3) not null check (dose > 0),
  dose_unit      text not null,
  route          medication_route not null default 'oral',
  interval_hours integer not null check (interval_hours > 0),
  start_date     date not null,
  end_date       date,
  instructions   text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint medications_end_after_start
    check (end_date is null or end_date >= start_date)
);

comment on table medications is 'Tratamientos prescritos. Generan la agenda de tomas en medication_doses.';
comment on column medications.condition_id is 'Padecimiento que trata. Al borrar el padecimiento el tratamiento sobrevive huérfano (on delete set null).';
comment on column medications.dose is 'Cantidad por toma, p. ej. 2.5. La unidad va en dose_unit.';
comment on column medications.interval_hours is 'Horas entre tomas: 24 = una vez al día, 12 = cada doce horas, 8 = cada ocho. Es el paso con el que se genera la agenda de medication_doses.';
comment on column medications.end_date is 'null en tratamientos crónicos e indefinidos.';

-- --- Tabla: medication_doses -------------------------------------------------
-- Cada toma concreta de la agenda. Sin updated_at: el ciclo de vida de una toma
-- se refleja en status y taken_at.

create table if not exists medication_doses (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications (id) on delete cascade,
  pet_id        uuid not null references pets (id) on delete cascade,
  scheduled_at  timestamptz not null,
  taken_at      timestamptz,
  status        dose_status not null default 'pending',
  notes         text,
  created_at    timestamptz not null default now(),
  constraint medication_doses_unique_slot unique (medication_id, scheduled_at)
);

comment on table medication_doses is 'Tomas individuales de un tratamiento.';
comment on constraint medication_doses_unique_slot on medication_doses is
  'IMPORTANTE: esta unicidad es lo que hace idempotente la regeneración de la agenda. El generador de tomas puede reejecutarse sobre un tratamiento ya sembrado usando insert ... on conflict (medication_id, scheduled_at) do nothing, sin duplicar huecos ni pisar el estado de las tomas ya administradas.';
comment on column medication_doses.pet_id is 'Denormalizado desde medications.pet_id para poder listar la agenda de una mascota sin join y para que la política RLS sea directa.';
comment on column medication_doses.taken_at is 'Momento real de administración. null mientras status no sea taken.';

-- --- Tabla: clinical_events --------------------------------------------------

create table if not exists clinical_events (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references pets (id) on delete cascade,
  type        clinical_event_type not null default 'visit',
  title       text not null,
  occurred_at date not null,
  vet_name    text,
  clinic      text,
  description text,
  next_due_at date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table clinical_events is 'Historia clínica: consultas, vacunas, desparasitaciones, cirugías, análisis...';
comment on column clinical_events.next_due_at is 'Próxima fecha prevista derivada de este evento: refuerzo de vacuna, siguiente desparasitación, revisión de control. Si ya pasó, la UI lo marca como vencido.';

-- --- Tabla: photos -----------------------------------------------------------

create table if not exists photos (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references pets (id) on delete cascade,
  url        text not null,
  caption    text,
  taken_at   date,
  is_cover   boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table photos is 'Galería de la mascota. Sin updated_at: una foto se reemplaza, no se edita.';
comment on column photos.is_cover is 'Foto de portada: la que representa a la mascota en el mural. Como máximo una por mascota, garantizado por el índice único parcial photos_one_cover_per_pet_idx.';

-- --- Tabla: reminders --------------------------------------------------------

create table if not exists reminders (
  id            uuid primary key default gen_random_uuid(),
  pet_id        uuid not null references pets (id) on delete cascade,
  type          reminder_type not null default 'custom',
  title         text not null,
  due_at        timestamptz not null,
  recurrence    recurrence not null default 'none',
  medication_id uuid references medications (id) on delete cascade,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table reminders is 'Recordatorios de la agenda: medicación, vacunas, revisiones, cumpleaños.';
comment on column reminders.medication_id is 'Tratamiento que originó el recordatorio, si lo hubo. Al borrar el tratamiento el recordatorio deja de tener sentido, por eso cascada.';
comment on column reminders.completed_at is 'null mientras el recordatorio siga pendiente. Es el filtro del índice reminders_pending_due_idx.';

-- --- Índices -----------------------------------------------------------------
-- Uno por cada clave foránea (Postgres no los crea solo) más los índices que
-- sostienen las consultas reales de la aplicación.

create index if not exists pets_owner_id_idx on pets (owner_id);
create index if not exists pets_public_idx on pets (is_public) where is_public;

create index if not exists weight_entries_pet_id_idx on weight_entries (pet_id);
create index if not exists weight_entries_pet_measured_idx on weight_entries (pet_id, measured_at desc);

create index if not exists conditions_pet_id_idx on conditions (pet_id);

create index if not exists medications_pet_id_idx on medications (pet_id);
create index if not exists medications_condition_id_idx on medications (condition_id);

create index if not exists medication_doses_medication_id_idx on medication_doses (medication_id);
create index if not exists medication_doses_pet_id_idx on medication_doses (pet_id);
create index if not exists medication_doses_pet_scheduled_idx on medication_doses (pet_id, scheduled_at);
create index if not exists medication_doses_pending_idx on medication_doses (status) where status = 'pending';

create index if not exists clinical_events_pet_id_idx on clinical_events (pet_id);
create index if not exists clinical_events_pet_occurred_idx on clinical_events (pet_id, occurred_at desc);

create index if not exists photos_pet_id_idx on photos (pet_id);
-- Como mucho una portada por mascota.
create unique index if not exists photos_one_cover_per_pet_idx on photos (pet_id) where is_cover;

create index if not exists reminders_pet_id_idx on reminders (pet_id);
create index if not exists reminders_medication_id_idx on reminders (medication_id);
create index if not exists reminders_pending_due_idx on reminders (due_at) where completed_at is null;

-- --- Disparadores de updated_at ----------------------------------------------
-- Solo en las tablas que tienen la columna: pets, conditions, medications,
-- clinical_events y reminders. weight_entries, medication_doses y photos no.

drop trigger if exists pets_set_updated_at on pets;
create trigger pets_set_updated_at
  before update on pets
  for each row execute function set_updated_at();

drop trigger if exists conditions_set_updated_at on conditions;
create trigger conditions_set_updated_at
  before update on conditions
  for each row execute function set_updated_at();

drop trigger if exists medications_set_updated_at on medications;
create trigger medications_set_updated_at
  before update on medications
  for each row execute function set_updated_at();

drop trigger if exists clinical_events_set_updated_at on clinical_events;
create trigger clinical_events_set_updated_at
  before update on clinical_events
  for each row execute function set_updated_at();

drop trigger if exists reminders_set_updated_at on reminders;
create trigger reminders_set_updated_at
  before update on reminders
  for each row execute function set_updated_at();

-- =============================================================================
-- SEGURIDAD A NIVEL DE FILA (RLS)
-- =============================================================================
-- LEER ANTES DE TOCAR NADA DE ESTA SECCIÓN:
--
-- 1. Hoy la aplicación NO tiene autenticación de personas usuarias. Todo el
--    acceso a la base de datos ocurre en código de servidor (route handlers y
--    server actions de Next.js) usando la SERVICE_ROLE key. Esa clave IGNORA
--    por completo la RLS, así que estas políticas no afectan a la app actual:
--    ni la protegen ni la rompen.
--
-- 2. Aun así activamos RLS en todas las tablas. Sin `enable row level security`
--    una anon key filtraría la base entera en cuanto alguien la usara desde el
--    navegador. Con RLS activa y sin política aplicable, el resultado por
--    defecto es "cero filas": el modo seguro.
--
-- 3. Las políticas están escritas para el estado FUTURO, cuando exista
--    Supabase Auth. En ese momento auth.uid() devolverá el id de la persona
--    autenticada, pets.owner_id apuntará a auth.users(id) y estas reglas
--    entrarán en vigor solas, sin migración adicional. La regla es siempre la
--    misma: una fila es tuya si su mascota es tuya.
--
-- 4. El rol `anon` solo puede leer el mural: mascotas con is_public y las fotos
--    de esas mascotas. Nada más. Pesos, padecimientos, medicación, historia
--    clínica y recordatorios no son públicos jamás.
--
-- 5. NUNCA expongas la service_role key al cliente. Es la única razón por la
--    que este esquema es seguro hoy.
-- =============================================================================

alter table pets enable row level security;
alter table weight_entries enable row level security;
alter table conditions enable row level security;
alter table medications enable row level security;
alter table medication_doses enable row level security;
alter table clinical_events enable row level security;
alter table photos enable row level security;
alter table reminders enable row level security;

-- --- Políticas: pets ---------------------------------------------------------

drop policy if exists pets_owner_select on pets;
create policy pets_owner_select on pets
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists pets_owner_insert on pets;
create policy pets_owner_insert on pets
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists pets_owner_update on pets;
create policy pets_owner_update on pets
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists pets_owner_delete on pets;
create policy pets_owner_delete on pets
  for delete to authenticated
  using (owner_id = auth.uid());

-- Mural público: cualquiera puede ver las mascotas marcadas como públicas.
drop policy if exists pets_anon_public_select on pets;
create policy pets_anon_public_select on pets
  for select to anon
  using (is_public);

-- --- Políticas: weight_entries -----------------------------------------------

drop policy if exists weight_entries_owner_select on weight_entries;
create policy weight_entries_owner_select on weight_entries
  for select to authenticated
  using (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = auth.uid()));

drop policy if exists weight_entries_owner_insert on weight_entries;
create policy weight_entries_owner_insert on weight_entries
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = auth.uid()));

drop policy if exists weight_entries_owner_update on weight_entries;
create policy weight_entries_owner_update on weight_entries
  for update to authenticated
  using (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = auth.uid()));

drop policy if exists weight_entries_owner_delete on weight_entries;
create policy weight_entries_owner_delete on weight_entries
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = auth.uid()));

-- --- Políticas: conditions ---------------------------------------------------

drop policy if exists conditions_owner_select on conditions;
create policy conditions_owner_select on conditions
  for select to authenticated
  using (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = auth.uid()));

drop policy if exists conditions_owner_insert on conditions;
create policy conditions_owner_insert on conditions
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = auth.uid()));

drop policy if exists conditions_owner_update on conditions;
create policy conditions_owner_update on conditions
  for update to authenticated
  using (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = auth.uid()));

drop policy if exists conditions_owner_delete on conditions;
create policy conditions_owner_delete on conditions
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = auth.uid()));

-- --- Políticas: medications --------------------------------------------------

drop policy if exists medications_owner_select on medications;
create policy medications_owner_select on medications
  for select to authenticated
  using (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = auth.uid()));

drop policy if exists medications_owner_insert on medications;
create policy medications_owner_insert on medications
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = auth.uid()));

drop policy if exists medications_owner_update on medications;
create policy medications_owner_update on medications
  for update to authenticated
  using (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = auth.uid()));

drop policy if exists medications_owner_delete on medications;
create policy medications_owner_delete on medications
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = auth.uid()));

-- --- Políticas: medication_doses ---------------------------------------------

drop policy if exists medication_doses_owner_select on medication_doses;
create policy medication_doses_owner_select on medication_doses
  for select to authenticated
  using (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = auth.uid()));

drop policy if exists medication_doses_owner_insert on medication_doses;
create policy medication_doses_owner_insert on medication_doses
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = auth.uid()));

drop policy if exists medication_doses_owner_update on medication_doses;
create policy medication_doses_owner_update on medication_doses
  for update to authenticated
  using (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = auth.uid()));

drop policy if exists medication_doses_owner_delete on medication_doses;
create policy medication_doses_owner_delete on medication_doses
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = auth.uid()));

-- --- Políticas: clinical_events ----------------------------------------------

drop policy if exists clinical_events_owner_select on clinical_events;
create policy clinical_events_owner_select on clinical_events
  for select to authenticated
  using (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = auth.uid()));

drop policy if exists clinical_events_owner_insert on clinical_events;
create policy clinical_events_owner_insert on clinical_events
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = auth.uid()));

drop policy if exists clinical_events_owner_update on clinical_events;
create policy clinical_events_owner_update on clinical_events
  for update to authenticated
  using (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = auth.uid()));

drop policy if exists clinical_events_owner_delete on clinical_events;
create policy clinical_events_owner_delete on clinical_events
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = auth.uid()));

-- --- Políticas: photos -------------------------------------------------------

drop policy if exists photos_owner_select on photos;
create policy photos_owner_select on photos
  for select to authenticated
  using (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = auth.uid()));

drop policy if exists photos_owner_insert on photos;
create policy photos_owner_insert on photos
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = auth.uid()));

drop policy if exists photos_owner_update on photos;
create policy photos_owner_update on photos
  for update to authenticated
  using (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = auth.uid()));

drop policy if exists photos_owner_delete on photos;
create policy photos_owner_delete on photos
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = auth.uid()));

-- Mural público: las fotos de una mascota pública también lo son.
drop policy if exists photos_anon_public_select on photos;
create policy photos_anon_public_select on photos
  for select to anon
  using (exists (select 1 from pets p where p.id = photos.pet_id and p.is_public));

-- --- Políticas: reminders ----------------------------------------------------

drop policy if exists reminders_owner_select on reminders;
create policy reminders_owner_select on reminders
  for select to authenticated
  using (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = auth.uid()));

drop policy if exists reminders_owner_insert on reminders;
create policy reminders_owner_insert on reminders
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = auth.uid()));

drop policy if exists reminders_owner_update on reminders;
create policy reminders_owner_update on reminders
  for update to authenticated
  using (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = auth.uid()));

drop policy if exists reminders_owner_delete on reminders;
create policy reminders_owner_delete on reminders
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = auth.uid()));

-- --- Fin de la migración inicial ---------------------------------------------
