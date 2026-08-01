-- =============================================================================
-- Datos de demostraciÃ³n de pet-med.
--
-- Fecha de referencia: 2026-08-01. Todas las fechas son literales (no now() ni
-- current_date) para que el conjunto sea reproducible: lo que se ve en la UI es
-- siempre lo mismo, ejecutes el seed hoy o dentro de un mes.
--
-- Los UUID son literales y deliberadamente legibles para que las claves
-- forÃ¡neas se lean de un vistazo:
--   00000000-â€¦ persona propietaria
--   1111â€¦/2222â€¦/3333â€¦  mascotas (Luna, Milo, Rocco)
--   10000000-â€¦  pesajes      20000000-â€¦  padecimientos
--   30000000-â€¦  medicaciÃ³n   40000000-â€¦  tomas
--   50000000-â€¦  historia     60000000-â€¦  fotos      70000000-â€¦  recordatorios
--
-- Todo va con `on conflict do nothing`: el seed se puede reejecutar sin
-- duplicar nada.
-- =============================================================================

-- --- Mascotas ----------------------------------------------------------------
-- Propietaria de demo: 00000000-0000-0000-0000-000000000001

insert into pets (
  id, owner_id, name, species, breed, breed_ref_id, size, sex,
  birth_date, adoption_date, color, microchip, sterilized, bio, avatar_url, is_public
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Luna', 'dog', 'Golden Retriever', '81', 'large', 'female',
    '2021-04-12', '2021-06-05', 'Dorado', '941000012345678', true,
    'Adora el agua y no perdona el paseo de las siete. Lleva bien su displasia mientras no la dejen saltar del sofÃ¡.',
    'https://picsum.photos/seed/luna-avatar/600/600', true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'Milo', 'cat', 'SiamÃ©s', 'siam', 'small', 'male',
    '2019-09-03', '2019-11-20', 'Seal point', '941000087654321', true,
    'Habla mÃ¡s que muchas personas. Con su dieta renal estÃ¡ estupendo.',
    'https://picsum.photos/seed/milo-avatar/600/600', true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    'Rocco', 'dog', 'Chihuahua', '55', 'small', 'male',
    '2023-11-20', '2024-01-15', 'Canela', null, false,
    'Dos kilos y medio de carÃ¡cter. En tratamiento por una alergia alimentaria reciÃ©n diagnosticada.',
    null, false
  )
on conflict do nothing;

-- --- Pesajes -----------------------------------------------------------------
-- Luna: 28,00 -> 30,30 kg en dieciocho meses, un +8,2 % sostenido. Es justo el
-- tramo que el indicador de tendencia debe pintar como "watch" (vigilar).
-- Milo: estable, sin sorpresas. Rocco: cachorro que termina de crecer.

insert into weight_entries (id, pet_id, measured_at, weight_kg, body_condition_score, notes) values
  ('10000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2025-02-15', 28.00, 5, 'Peso de referencia tras la revisiÃ³n anual.'),
  ('10000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', '2025-06-20', 28.60, 5, null),
  ('10000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', '2025-11-08', 29.20, 6, 'Menos paseo desde que empezÃ³ a cojear.'),
  ('10000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111', '2026-03-14', 29.80, 6, null),
  ('10000000-0000-4000-8000-000000000005', '11111111-1111-1111-1111-111111111111', '2026-07-18', 30.30, 7, 'La veterinaria recomienda ajustar la raciÃ³n.'),

  ('10000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222', '2025-03-02', 4.60, 5, null),
  ('10000000-0000-4000-8000-000000000012', '22222222-2222-2222-2222-222222222222', '2025-08-16', 4.55, 5, null),
  ('10000000-0000-4000-8000-000000000013', '22222222-2222-2222-2222-222222222222', '2026-01-24', 4.50, 5, 'Estable con la dieta renal.'),
  ('10000000-0000-4000-8000-000000000014', '22222222-2222-2222-2222-222222222222', '2026-06-30', 4.52, 5, null),

  ('10000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333', '2025-02-08', 1.80, 4, 'TodavÃ­a creciendo.'),
  ('10000000-0000-4000-8000-000000000022', '33333333-3333-3333-3333-333333333333', '2025-05-30', 2.30, 5, null),
  ('10000000-0000-4000-8000-000000000023', '33333333-3333-3333-3333-333333333333', '2025-10-11', 2.70, 5, null),
  ('10000000-0000-4000-8000-000000000024', '33333333-3333-3333-3333-333333333333', '2026-02-21', 2.85, 5, 'Peso adulto alcanzado.'),
  ('10000000-0000-4000-8000-000000000025', '33333333-3333-3333-3333-333333333333', '2026-07-05', 2.90, 5, null)
on conflict do nothing;

-- --- Padecimientos -----------------------------------------------------------

insert into conditions (id, pet_id, name, category, severity, status, diagnosed_at, resolved_at, notes) values
  (
    '20000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
    'Displasia de cadera', 'chronic', 'moderate', 'in_treatment', '2025-09-12', null,
    'Grado moderado en la cadera izquierda. Control del peso y paseo suave; nada de escaleras ni saltos.'
  ),
  (
    '20000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
    'Otitis externa', 'infection', 'mild', 'resolved', '2026-02-10', '2026-03-01',
    'OÃ­do derecho. Resuelta tras tres semanas de gotas.'
  ),
  (
    '20000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222',
    'Enfermedad renal crÃ³nica', 'chronic', 'moderate', 'controlled', '2025-05-19', null,
    'Estadio 2 IRIS. Dieta renal especÃ­fica y analÃ­tica cada seis meses.'
  ),
  (
    '20000000-0000-4000-8000-000000000012', '22222222-2222-2222-2222-222222222222',
    'Gingivitis', 'dental', 'mild', 'active', '2026-04-06', null,
    'Detectada en la revisiÃ³n dental. Pendiente de valorar limpieza bucal.'
  ),
  (
    '20000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333',
    'Alergia alimentaria', 'allergy', 'mild', 'in_treatment', '2026-05-22', null,
    'Prurito y enrojecimiento en las axilas. Dieta de eliminaciÃ³n con proteÃ­na hidrolizada.'
  )
on conflict do nothing;

-- --- MedicaciÃ³n --------------------------------------------------------------
-- Un tratamiento activo por mascota, cada uno con un intervalo distinto para
-- que la agenda de tomas se vea variada (12 h, 24 h).

insert into medications (
  id, pet_id, condition_id, name, dose, dose_unit, route,
  interval_hours, start_date, end_date, instructions, is_active
) values
  (
    '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
    '20000000-0000-4000-8000-000000000001',
    'Carprofeno', 50, 'mg', 'oral',
    12, '2026-07-20', '2026-08-19',
    'Siempre con comida. Suspender y avisar si aparecen vÃ³mitos o heces oscuras.', true
  ),
  (
    '30000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222',
    '20000000-0000-4000-8000-000000000011',
    'Benazepril', 2.5, 'mg', 'oral',
    24, '2026-01-15', null,
    'Tratamiento crÃ³nico e indefinido. Una toma por la maÃ±ana, en ayunas.', true
  ),
  (
    '30000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333',
    '20000000-0000-4000-8000-000000000021',
    'Oclacitinib', 3.6, 'mg', 'oral',
    24, '2026-07-25', '2026-08-24', 'Con la cena. No partir el comprimido.', true
  )
on conflict do nothing;

-- --- Tomas -------------------------------------------------------------------
-- Agenda alrededor del 2026-08-01: pasado ya administrado, futuro pendiente y
-- alguna omisiÃ³n para que el porcentaje de adherencia no salga perfecto.
-- La unicidad (medication_id, scheduled_at) hace que reejecutar el generador de
-- agenda no duplique estos huecos.

insert into medication_doses (id, medication_id, pet_id, scheduled_at, taken_at, status, notes) values
  -- Luna, carprofeno cada 12 h (08:00 y 20:00 UTC)
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-07-30T08:00:00Z', '2026-07-30T08:12:00Z', 'taken', null),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-07-30T20:00:00Z', '2026-07-30T20:05:00Z', 'taken', null),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-07-31T08:00:00Z', '2026-07-31T08:30:00Z', 'taken', null),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-07-31T20:00:00Z', null, 'missed', 'Se quedÃ³ en casa de la vecina y nadie le dio la pastilla.'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-08-01T08:00:00Z', '2026-08-01T08:03:00Z', 'taken', null),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-08-01T20:00:00Z', null, 'pending', null),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-08-02T08:00:00Z', null, 'pending', null),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-08-02T20:00:00Z', null, 'pending', null),

  -- Milo, benazepril cada 24 h (07:30 UTC)
  ('40000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222', '2026-07-30T07:30:00Z', '2026-07-30T07:40:00Z', 'taken', null),
  ('40000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222', '2026-07-31T07:30:00Z', '2026-07-31T07:35:00Z', 'taken', null),
  ('40000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222', '2026-08-01T07:30:00Z', '2026-08-01T07:50:00Z', 'taken', 'Escondido en el patÃ© renal.'),
  ('40000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222', '2026-08-02T07:30:00Z', null, 'pending', null),
  ('40000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222', '2026-08-03T07:30:00Z', null, 'pending', null),

  -- Rocco, oclacitinib cada 24 h (19:00 UTC)
  ('40000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333', '2026-07-30T19:00:00Z', '2026-07-30T19:15:00Z', 'taken', null),
  ('40000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333', '2026-07-31T19:00:00Z', null, 'skipped', 'Sin cena por una revisiÃ³n con ayuno; la veterinaria autorizÃ³ saltarla.'),
  ('40000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333', '2026-08-01T19:00:00Z', null, 'pending', null),
  ('40000000-0000-4000-8000-000000000024', '30000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333', '2026-08-02T19:00:00Z', null, 'pending', null)
on conflict do nothing;

-- --- Historia clÃ­nica --------------------------------------------------------
-- Cada mascota tiene una vacuna con refuerzo prÃ³ximo (next_due_at por delante
-- del 2026-08-01) y una desparasitaciÃ³n vencida (next_due_at ya pasado), para
-- que los avisos de la ficha se vean en los dos estados.

insert into clinical_events (
  id, pet_id, type, title, occurred_at, vet_name, clinic, description, next_due_at
) values
  -- Luna
  (
    '50000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
    'visit', 'Consulta por cojera en la pata trasera', '2025-09-12',
    'Dra. Elena Ruiz', 'ClÃ­nica Veterinaria Arroyo',
    'RadiografÃ­a de cadera: displasia moderada en el lado izquierdo. Se inicia control de peso y ejercicio suave.', null
  ),
  (
    '50000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
    'vaccine', 'Vacuna polivalente anual', '2025-08-20',
    'Dra. Elena Ruiz', 'ClÃ­nica Veterinaria Arroyo',
    'Polivalente + leishmania. Sin reacciÃ³n adversa.', '2026-08-20'
  ),
  (
    '50000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111',
    'deworming', 'DesparasitaciÃ³n interna', '2026-01-10',
    'Dra. Elena Ruiz', 'ClÃ­nica Veterinaria Arroyo',
    'Pauta trimestral. VENCIDA: tocaba en abril.', '2026-04-10'
  ),
  (
    '50000000-0000-4000-8000-000000000004', '11111111-1111-1111-1111-111111111111',
    'lab', 'AnalÃ­tica de control', '2026-07-18',
    'Dr. Marc SolÃ©', 'ClÃ­nica Veterinaria Arroyo',
    'BioquÃ­mica y hemograma previos a reanudar el antiinflamatorio. Todo dentro de rango.', null
  ),

  -- Milo
  (
    '50000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222',
    'vaccine', 'Trivalente felina', '2025-08-12',
    'Dra. Elena Ruiz', 'ClÃ­nica Veterinaria Arroyo',
    'Refuerzo anual de trivalente.', '2026-08-12'
  ),
  (
    '50000000-0000-4000-8000-000000000012', '22222222-2222-2222-2222-222222222222',
    'deworming', 'DesparasitaciÃ³n interna y externa', '2025-12-05',
    'Dr. Marc SolÃ©', 'ClÃ­nica Veterinaria Arroyo',
    'Pauta semestral. VENCIDA: tocaba en junio.', '2026-06-05'
  ),
  (
    '50000000-0000-4000-8000-000000000013', '22222222-2222-2222-2222-222222222222',
    'visit', 'RevisiÃ³n dental', '2026-04-06',
    'Dra. Elena Ruiz', 'ClÃ­nica Veterinaria Arroyo',
    'Gingivitis leve en ambos arcos. Se pospone la limpieza hasta ver la evoluciÃ³n renal.', null
  ),
  (
    '50000000-0000-4000-8000-000000000014', '22222222-2222-2222-2222-222222222222',
    'lab', 'Perfil renal semestral', '2026-06-30',
    'Dr. Marc SolÃ©', 'ClÃ­nica Veterinaria Arroyo',
    'Creatinina y SDMA estables respecto al control anterior. Se mantiene la dosis de benazepril.', '2026-12-30'
  ),

  -- Rocco
  (
    '50000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333',
    'vaccine', 'Vacuna antirrÃ¡bica', '2025-08-25',
    'Dra. Nuria Cano', 'Centro Veterinario La Alameda',
    'AntirrÃ¡bica obligatoria, primera revacunaciÃ³n.', '2026-08-25'
  ),
  (
    '50000000-0000-4000-8000-000000000022', '33333333-3333-3333-3333-333333333333',
    'deworming', 'DesparasitaciÃ³n interna', '2026-02-14',
    'Dra. Nuria Cano', 'Centro Veterinario La Alameda',
    'Pauta trimestral. VENCIDA: tocaba en mayo.', '2026-05-14'
  ),
  (
    '50000000-0000-4000-8000-000000000023', '33333333-3333-3333-3333-333333333333',
    'visit', 'Consulta dermatolÃ³gica', '2026-05-22',
    'Dra. Nuria Cano', 'Centro Veterinario La Alameda',
    'Prurito axilar recurrente. Se descarta sarna y se inicia dieta de eliminaciÃ³n durante ocho semanas.', null
  )
on conflict do nothing;

-- --- Fotos -------------------------------------------------------------------
-- Exactamente una portada por mascota: el Ã­ndice parcial Ãºnico lo impide de
-- todos modos, pero conviene que el seed ya sea coherente.

insert into photos (id, pet_id, url, caption, taken_at, is_cover) values
  ('60000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'https://picsum.photos/seed/luna-playa/1200/900', 'Primer baÃ±o del verano', '2026-06-28', true),
  ('60000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111', 'https://picsum.photos/seed/luna-sofa/1200/900', 'Su sitio, segÃºn ella', '2026-03-02', false),
  ('60000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111111', 'https://picsum.photos/seed/luna-cachorra/1200/900', 'ReciÃ©n llegada a casa', '2021-06-06', false),

  ('60000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222', 'https://picsum.photos/seed/milo-ventana/1200/900', 'Vigilando el patio', '2026-05-11', true),
  ('60000000-0000-4000-8000-000000000012', '22222222-2222-2222-2222-222222222222', 'https://picsum.photos/seed/milo-caja/1200/900', 'La caja siempre gana', '2025-10-19', false),

  ('60000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333', 'https://picsum.photos/seed/rocco-manta/1200/900', 'Modo burrito', '2026-07-12', true),
  ('60000000-0000-4000-8000-000000000022', '33333333-3333-3333-3333-333333333333', 'https://picsum.photos/seed/rocco-parque/1200/900', 'Convencido de que es un mastÃ­n', '2026-04-30', false)
on conflict do nothing;

-- --- Recordatorios -----------------------------------------------------------

insert into reminders (id, pet_id, type, title, due_at, recurrence, medication_id, completed_at, notes) values
  (
    '70000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
    'vaccine', 'Refuerzo de la polivalente', '2026-08-20T09:00:00Z', 'yearly', null, null,
    'Pedir cita con una semana de margen.'
  ),
  (
    '70000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111111',
    'medication', 'Carprofeno de la noche', '2026-08-01T20:00:00Z', 'daily',
    '30000000-0000-4000-8000-000000000001', null, 'Siempre despuÃ©s de cenar.'
  ),

  (
    '70000000-0000-4000-8000-000000000011', '22222222-2222-2222-2222-222222222222',
    'deworming', 'DesparasitaciÃ³n vencida', '2026-06-05T10:00:00Z', 'biannual', null, null,
    'Se pasÃ³ la fecha; comprar la pipeta esta semana.'
  ),
  (
    '70000000-0000-4000-8000-000000000012', '22222222-2222-2222-2222-222222222222',
    'checkup', 'AnalÃ­tica renal semestral', '2026-12-30T09:30:00Z', 'biannual', null, null, null
  ),

  (
    '70000000-0000-4000-8000-000000000021', '33333333-3333-3333-3333-333333333333',
    'checkup', 'RevisiÃ³n de la dieta de eliminaciÃ³n', '2026-08-10T17:00:00Z', 'none', null, null,
    'Ocho semanas desde el inicio: valorar si se reintroduce proteÃ­na.'
  ),
  (
    '70000000-0000-4000-8000-000000000022', '33333333-3333-3333-3333-333333333333',
    'birthday', 'CumpleaÃ±os de Rocco', '2026-11-20T08:00:00Z', 'yearly', null, null, null
  )
on conflict do nothing;

-- --- Fin del seed ------------------------------------------------------------

