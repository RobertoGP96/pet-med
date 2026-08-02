-- =============================================================================
-- El correo en el perfil.
--
-- El panel de administración necesita distinguir cuentas, y `display_name` no
-- sirve: no es único y puede estar vacío. El correo vive en auth.users, que no
-- es consultable desde PostgREST, así que se copia a profiles.
--
-- Es un dato personal y por eso sólo lo ve su dueño o un administrador: la
-- política `profiles_self_select` de la migración anterior ya lo limita a eso,
-- y esta columna hereda esa regla sin añadir nada.
--
-- Idempotente: se puede ejecutar dos veces.
-- =============================================================================

alter table profiles add column if not exists email text;

comment on column profiles.email is
  'Copia de auth.users.email, mantenida al día por el disparador sync_profile_from_auth. Existe porque auth.users no se puede consultar desde la API.';

-- --- Alta y sincronización del perfil ----------------------------------------
-- Sustituye a `handle_new_user` de la migración anterior. Ahora hace dos cosas:
-- crea el perfil al registrarse y refresca el correo si la cuenta lo cambia.
-- Sin lo segundo, cambiar de correo dejaría el panel mostrando el antiguo para
-- siempre.
--
-- El `do update` toca SÓLO el correo: `display_name` es del perfil, lo edita su
-- dueño desde la aplicación, y pisarlo con el metadato del registro le
-- devolvería el nombre que puso el primer día.

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

comment on function public.sync_profile_from_auth() is
  'Crea el perfil al registrarse y mantiene el correo al día. SECURITY DEFINER porque se dispara sobre auth.users.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_from_auth();

-- La función anterior queda sin disparadores que la usen.
drop function if exists public.handle_new_user();

-- Correos de las cuentas que ya existieran.
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is distinct from u.email;
