-- =============================================================================
-- Autenticación real: perfiles, roles y moderación del mural.
--
-- Esta migración cierra el hueco que dejó abierto 20260801120000_init.sql: allí
-- la RLS quedó escrita pero inerte, porque toda la aplicación entraba con la
-- clave service_role y `pets.owner_id` era un uuid suelto sin clave foránea.
-- A partir de aquí:
--
--   · cada persona usuaria es una fila de auth.users con su espejo en profiles;
--   · `profiles.role` distingue 'user' de 'admin';
--   · el mural deja de ser «lo que marque el dueño» y pasa a ser «todo lo que
--     no esté oculto», con el administrador como moderador.
--
-- Es idempotente: se puede ejecutar dos veces sin romper nada.
--
-- Al cambiar algo aquí hay que actualizar también
-- src/lib/supabase/database.types.ts (AGENTS.md, regla 6).
-- =============================================================================

-- --- Tipo enumerado del rol --------------------------------------------------
-- Se llama `user_role` y no `role` para no chocar con la nomenclatura interna
-- de Postgres, igual que se hizo con `pet_size`.

do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

-- --- Tabla: profiles ---------------------------------------------------------
-- Espejo público de auth.users. Existe por dos razones: auth.users no es
-- consultable desde PostgREST, y el rol necesita vivir en una tabla sobre la
-- que se puedan escribir políticas.

create table if not exists profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         user_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table profiles is
  'Perfil público de cada persona usuaria. Una fila por auth.users, creada por el disparador on_auth_user_created.';
comment on column profiles.role is
  'ROL. ''user'' sólo ve lo suyo; ''admin'' modera el mural y ve todas las mascotas. El primer administrador se marca a mano desde el SQL Editor (ver el final de este archivo).';
comment on column profiles.display_name is
  'Nombre visible. Si no se indica al registrarse, se rellena con la parte del correo anterior a la arroba.';

alter table profiles enable row level security;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- --- ¿Quién es administrador? ------------------------------------------------
-- SECURITY DEFINER a propósito: si esta consulta pasara por la RLS de profiles,
-- las políticas que la usan se llamarían a sí mismas y Postgres abortaría por
-- recursión infinita. Al ser definer, lee profiles saltándose la RLS.
-- `search_path` fijado para que nadie pueda colar una tabla `profiles` propia.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'true si quien hace la petición tiene rol admin. SECURITY DEFINER para evitar la recursión de RLS sobre profiles.';

-- --- Alta automática de perfil -----------------------------------------------
-- Sin esto habría que crear el perfil desde la aplicación, y un fallo de red a
-- mitad del registro dejaría un auth.users sin profiles: una cuenta que no
-- puede hacer nada. El disparador lo hace en la misma transacción que el alta.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crea el perfil al registrarse. Se dispara sobre auth.users, por eso es SECURITY DEFINER.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Perfiles para las cuentas que ya existieran antes de esta migración.
insert into profiles (id, display_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
on conflict (id) do nothing;

-- --- El rol no se cambia solo -----------------------------------------------
-- La política de UPDATE de profiles deja a cada quien editar su propia fila,
-- pero la RLS razona por filas, no por columnas: sin esto, cualquiera podría
-- ascenderse a admin con un update a su propio perfil.

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Sólo un administrador puede cambiar el rol.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

comment on function public.guard_profile_role() is
  'Impide la autopromoción a admin: la RLS filtra filas, no columnas, así que el rol se protege aquí.';

drop trigger if exists profiles_guard_role on profiles;
create trigger profiles_guard_role
  before update on profiles
  for each row execute function public.guard_profile_role();

-- --- Políticas: profiles -----------------------------------------------------

drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Sin política de INSERT ni de DELETE: las filas las pone el disparador
-- (SECURITY DEFINER, se salta la RLS) y se borran en cascada con auth.users.

-- =============================================================================
-- PETS: dueño real y moderación del mural
-- =============================================================================

-- --- Clave foránea al usuario ------------------------------------------------
-- `not valid` a propósito: las mascotas sembradas por supabase/seed.sql apuntan
-- a un owner_id inventado que no existe en auth.users, y validarlas haría
-- fallar la migración. La restricción SÍ se aplica a todo lo que se inserte o
-- actualice a partir de ahora, que es lo que importa. Cuando ya no queden datos
-- de ejemplo se puede cerrar el círculo con:
--     alter table pets validate constraint pets_owner_id_fkey;

do $$ begin
  alter table pets
    add constraint pets_owner_id_fkey
    foreign key (owner_id) references auth.users (id) on delete cascade
    not valid;
exception when duplicate_object then null;
end $$;

-- --- Columnas de moderación --------------------------------------------------

alter table pets add column if not exists featured        boolean not null default false;
alter table pets add column if not exists featured_at     timestamptz;
alter table pets add column if not exists hidden_by_admin boolean not null default false;

comment on column pets.featured is
  'Destacada por un administrador: sale primero en el mural.';
comment on column pets.featured_at is
  'Momento en que se destacó. Ordena entre las destacadas, y volver a destacar una mascota la sube al principio: esto es el «reordenar» del panel de administración.';
comment on column pets.hidden_by_admin is
  'Retirada del mural por moderación. Es independiente de is_public: el dueño controla is_public, el administrador controla esta. Basta con que una de las dos diga que no para que la mascota no aparezca.';

-- El mural ahora enseña por defecto. Antes `is_public` nacía en false porque no
-- había forma de que una persona lo cambiara conscientemente; con registro sí la
-- hay, y el producto pide que una mascota recién dada de alta aparezca. Quien no
-- quiera salir lo desmarca en la ficha.
alter table pets alter column is_public set default true;

comment on column pets.is_public is
  'Si el dueño quiere que la mascota salga en el mural. Por defecto sí. La otra mitad de la decisión es hidden_by_admin.';

-- Índice que sostiene la consulta del mural, ya con el orden de destacadas.
drop index if exists pets_public_idx;
create index if not exists pets_mural_idx
  on pets (featured desc, featured_at desc nulls last, created_at desc)
  where is_public and not hidden_by_admin;

-- =============================================================================
-- POLÍTICAS QUE SUSTITUYEN A LAS DE LA MIGRACIÓN INICIAL
-- =============================================================================
-- Dos arreglos sobre lo que había:
--
-- 1. El mural era visible sólo para `anon`. En cuanto alguien inicia sesión su
--    rol pasa a `authenticated`, donde la única política de lectura era
--    «owner_id = auth.uid()»: el mural se le habría quedado VACÍO. Las nuevas
--    políticas de lectura pública cubren los dos roles.
-- 2. Se añade al administrador, que ve y modera todas las mascotas.

-- --- pets --------------------------------------------------------------------

drop policy if exists pets_anon_public_select on pets;

drop policy if exists pets_public_select on pets;
create policy pets_public_select on pets
  for select to anon, authenticated
  using (is_public and not hidden_by_admin);

drop policy if exists pets_owner_select on pets;
create policy pets_owner_select on pets
  for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists pets_owner_update on pets;
create policy pets_owner_update on pets
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists pets_owner_delete on pets;
create policy pets_owner_delete on pets
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- El INSERT no lleva `is_admin()`: un administrador modera mascotas ajenas, no
-- las da de alta a nombre de otra persona.

-- --- photos ------------------------------------------------------------------
-- Las fotos de una mascota visible en el mural son visibles con ella.

drop policy if exists photos_anon_public_select on photos;

drop policy if exists photos_public_select on photos;
create policy photos_public_select on photos
  for select to anon, authenticated
  using (exists (
    select 1 from pets p
    where p.id = photos.pet_id and p.is_public and not p.hidden_by_admin
  ));

-- =============================================================================
-- Alcance del administrador sobre el historial médico
-- =============================================================================
-- Deliberadamente NO se amplía el acceso del administrador a weight_entries,
-- conditions, medications, medication_doses, clinical_events ni reminders. Su
-- trabajo es moderar lo que se ve en el mural —nombre, foto, descripción—, no
-- leer el historial clínico de mascotas ajenas. Las políticas de esas seis
-- tablas siguen tal como las dejó la migración inicial.

-- =============================================================================
-- DESPUÉS DE EJECUTAR ESTO
-- =============================================================================
-- 1. Registrarse en la aplicación con el correo que vaya a administrar.
-- 2. Volver aquí y ascender esa cuenta:
--
--      update profiles set role = 'admin'
--      where id = (select id from auth.users where email = 'tu@correo.com');
--
--    A partir de ahí, ese administrador puede promover a otros desde /admin.
-- =============================================================================
