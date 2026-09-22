-- Listas personales de MyLibrary (Supabase/Postgres).
-- Ejecutar una vez en el SQL Editor del proyecto (convive con otras tablas en `public`;
-- el prefijo msl_ evita colisiones con tus demás proyectos).
-- Lectura pública; escritura solo del dueño (por email).

create table if not exists msl_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists msl_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references msl_lists (id) on delete cascade,
  store text not null check (store in ('steam', 'gog')),
  game_id integer not null default 0,
  title text not null default '',
  note text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists msl_list_items_list_id_idx on msl_list_items (list_id);

-- Migraciones idempotentes para tablas creadas con versiones anteriores:
-- slug (si la tabla nació sin él) y estilo de notas por lista.
alter table msl_lists add column if not exists slug text;

update msl_lists
set slug =
  trim(both '-' from left(
    regexp_replace(
      translate(lower(title),
        'áéíóúüñçàèìòùäëïöü',
        'aeiouuncaeioeaeiou'),
      '[^a-z0-9]+', '-', 'g'),
    40))
  || '-' || left(replace(id::text, '-', ''), 6)
where slug is null or slug = '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'msl_lists_slug_key') then
    alter table msl_lists add constraint msl_lists_slug_key unique (slug);
  end if;
end $$;

alter table msl_lists alter column slug set not null;

alter table msl_lists add column if not exists notes_style text not null default 'sutil';

alter table msl_lists enable row level security;
alter table msl_list_items enable row level security;

drop policy if exists "msl lectura publica" on msl_lists;
create policy "msl lectura publica" on msl_lists
  for select using (true);

drop policy if exists "msl lectura publica" on msl_list_items;
create policy "msl lectura publica" on msl_list_items
  for select using (true);

-- Sustituir por el email del dueño:
drop policy if exists "msl solo dueno" on msl_lists;
create policy "msl solo dueno" on msl_lists
  for all
  using ((auth.jwt() ->> 'email') = 'luismanuelbravocazares@hotmail.com')
  with check ((auth.jwt() ->> 'email') = 'luismanuelbravocazares@hotmail.com');

drop policy if exists "msl solo dueno" on msl_list_items;
create policy "msl solo dueno" on msl_list_items
  for all
  using ((auth.jwt() ->> 'email') = 'luismanuelbravocazares@hotmail.com')
  with check ((auth.jwt() ->> 'email') = 'luismanuelbravocazares@hotmail.com');
