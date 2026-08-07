-- Parentesco: padre y madre opcionales, referenciando a otra mascota del
-- sistema (propia o pública del mural). Los hermanos y los hijos no se
-- guardan: se derivan consultando estas dos columnas.

alter table pets
  add column father_id uuid references pets (id) on delete set null,
  add column mother_id uuid references pets (id) on delete set null;

comment on column pets.father_id is
  'Padre, si está registrado en el sistema. Al borrarlo el vínculo se vacía (set null); nunca arrastra a los hijos.';
comment on column pets.mother_id is
  'Madre, si está registrada en el sistema.';

-- Reglas de forma que no dependen de la aplicación. Con NULL los tres checks
-- pasan: el parentesco siempre es opcional.
alter table pets
  add constraint pets_father_not_self check (father_id <> id),
  add constraint pets_mother_not_self check (mother_id <> id),
  add constraint pets_parents_distinct
    check (father_id is null or mother_id is null or father_id <> mother_id);

-- Índices para «hermanos» e «hijos»: ambas consultas buscan por progenitor.
create index pets_father_id_idx on pets (father_id) where father_id is not null;
create index pets_mother_id_idx on pets (mother_id) where mother_id is not null;

-- Barrera real contra ciclos (una mascota como su propio ascendiente).
--
-- SECURITY DEFINER a propósito: la comprobación tiene que recorrer TODOS los
-- ancestros, también los que la RLS le oculta al usuario de la sesión. La
-- aplicación valida lo mismo antes de escribir para dar un error amable, pero
-- sólo ve las mascotas visibles; este disparador es el candado.
create or replace function public.pets_forbid_ancestor_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    with recursive ancestors as (
      select p.id, p.father_id, p.mother_id
        from pets p
       where p.id in (new.father_id, new.mother_id)
      union -- union (no union all): deduplica, y con ello garantiza terminar
      select p.id, p.father_id, p.mother_id
        from pets p
        join ancestors a on p.id in (a.father_id, a.mother_id)
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'Una mascota no puede ser su propio ascendiente.';
  end if;
  return new;
end;
$$;

create trigger pets_forbid_ancestor_cycle
  before insert or update of father_id, mother_id on pets
  for each row
  when (new.father_id is not null or new.mother_id is not null)
  execute function public.pets_forbid_ancestor_cycle();
