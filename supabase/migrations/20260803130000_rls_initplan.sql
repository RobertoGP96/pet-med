-- =============================================================================
-- RLS: evaluar auth.uid() e is_admin() una vez por consulta, no una por fila
-- =============================================================================
--
-- QUÉ CAMBIA. Nada del modelo de permisos: las reglas son exactamente las
-- mismas que ya había. Lo único que cambia es CÓMO las evalúa Postgres.
--
-- EL PROBLEMA. `auth.uid()` es una función, y dentro de una política se llama
-- una vez POR FILA examinada. Lo mismo vale para `public.is_admin()`, que
-- además consulta `profiles` cada vez. En una tabla con mil pesajes eso son mil
-- llamadas para responder a una sola pregunta que no cambia durante la
-- consulta: «¿quién eres?».
--
-- LA SOLUCIÓN. Envolverlas en un subselect —`(select auth.uid())`— hace que el
-- planificador las trate como un InitPlan: se evalúan una vez, al principio, y
-- el resultado se reutiliza para todas las filas. Es la recomendación oficial
-- de Supabase para políticas RLS.
--
-- DÓNDE SE NOTA. En las siete tablas del historial, cuyas políticas son del
-- tipo `exists (select 1 from pets p where p.id = X.pet_id and p.owner_id =
-- auth.uid())`. La ficha de una mascota lanza varias de esas consultas seguidas
-- y cada una pagaba la llamada por fila.
--
-- El `exists (...)` sobre `pets` se queda: es la comprobación de propiedad y
-- resuelve por la clave primaria de `pets`. Lo que se saca del bucle es sólo la
-- identidad.
--
-- Las políticas públicas del mural (`pets_public_select`, `photos_public_
-- select`) no aparecen aquí: no llaman a `auth.uid()` ni a `is_admin()`.
-- =============================================================================

-- --- profiles ----------------------------------------------------------------

drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- --- pets --------------------------------------------------------------------

drop policy if exists pets_owner_select on pets;
create policy pets_owner_select on pets
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- Sin `is_admin()`, igual que antes: un administrador modera mascotas ajenas,
-- no las da de alta a nombre de otra persona.
drop policy if exists pets_owner_insert on pets;
create policy pets_owner_insert on pets
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists pets_owner_update on pets;
create policy pets_owner_update on pets
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists pets_owner_delete on pets;
create policy pets_owner_delete on pets
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- --- weight_entries ----------------------------------------------------------

drop policy if exists weight_entries_owner_select on weight_entries;
create policy weight_entries_owner_select on weight_entries
  for select to authenticated
  using (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists weight_entries_owner_insert on weight_entries;
create policy weight_entries_owner_insert on weight_entries
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists weight_entries_owner_update on weight_entries;
create policy weight_entries_owner_update on weight_entries
  for update to authenticated
  using (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists weight_entries_owner_delete on weight_entries;
create policy weight_entries_owner_delete on weight_entries
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = weight_entries.pet_id and p.owner_id = (select auth.uid())));

-- --- conditions --------------------------------------------------------------

drop policy if exists conditions_owner_select on conditions;
create policy conditions_owner_select on conditions
  for select to authenticated
  using (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists conditions_owner_insert on conditions;
create policy conditions_owner_insert on conditions
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists conditions_owner_update on conditions;
create policy conditions_owner_update on conditions
  for update to authenticated
  using (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists conditions_owner_delete on conditions;
create policy conditions_owner_delete on conditions
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = conditions.pet_id and p.owner_id = (select auth.uid())));

-- --- medications -------------------------------------------------------------

drop policy if exists medications_owner_select on medications;
create policy medications_owner_select on medications
  for select to authenticated
  using (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists medications_owner_insert on medications;
create policy medications_owner_insert on medications
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists medications_owner_update on medications;
create policy medications_owner_update on medications
  for update to authenticated
  using (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists medications_owner_delete on medications;
create policy medications_owner_delete on medications
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = medications.pet_id and p.owner_id = (select auth.uid())));

-- --- medication_doses --------------------------------------------------------

drop policy if exists medication_doses_owner_select on medication_doses;
create policy medication_doses_owner_select on medication_doses
  for select to authenticated
  using (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists medication_doses_owner_insert on medication_doses;
create policy medication_doses_owner_insert on medication_doses
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists medication_doses_owner_update on medication_doses;
create policy medication_doses_owner_update on medication_doses
  for update to authenticated
  using (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists medication_doses_owner_delete on medication_doses;
create policy medication_doses_owner_delete on medication_doses
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = medication_doses.pet_id and p.owner_id = (select auth.uid())));

-- --- clinical_events ---------------------------------------------------------

drop policy if exists clinical_events_owner_select on clinical_events;
create policy clinical_events_owner_select on clinical_events
  for select to authenticated
  using (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists clinical_events_owner_insert on clinical_events;
create policy clinical_events_owner_insert on clinical_events
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists clinical_events_owner_update on clinical_events;
create policy clinical_events_owner_update on clinical_events
  for update to authenticated
  using (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists clinical_events_owner_delete on clinical_events;
create policy clinical_events_owner_delete on clinical_events
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = clinical_events.pet_id and p.owner_id = (select auth.uid())));

-- --- photos ------------------------------------------------------------------

drop policy if exists photos_owner_select on photos;
create policy photos_owner_select on photos
  for select to authenticated
  using (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists photos_owner_insert on photos;
create policy photos_owner_insert on photos
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists photos_owner_update on photos;
create policy photos_owner_update on photos
  for update to authenticated
  using (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists photos_owner_delete on photos;
create policy photos_owner_delete on photos
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = photos.pet_id and p.owner_id = (select auth.uid())));

-- --- reminders ---------------------------------------------------------------

drop policy if exists reminders_owner_select on reminders;
create policy reminders_owner_select on reminders
  for select to authenticated
  using (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists reminders_owner_insert on reminders;
create policy reminders_owner_insert on reminders
  for insert to authenticated
  with check (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists reminders_owner_update on reminders;
create policy reminders_owner_update on reminders
  for update to authenticated
  using (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = (select auth.uid())));

drop policy if exists reminders_owner_delete on reminders;
create policy reminders_owner_delete on reminders
  for delete to authenticated
  using (exists (select 1 from pets p where p.id = reminders.pet_id and p.owner_id = (select auth.uid())));
