# Supabase setup para ChartDB (Auth + Cloud Sync)

Este documento crea las tablas necesarias para sincronizar diagramas de ChartDB y aplica RLS para que cada usuario solo acceda a sus propios datos.

> Requisitos:
> - Tener habilitado **Supabase Auth**.
> - Ejecutar este SQL en el **SQL Editor** de tu proyecto Supabase.

## SQL completo

```sql
create extension if not exists pgcrypto;

create table if not exists public.diagrams (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    database_type text not null,
    database_edition text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists diagrams_user_id_idx on public.diagrams(user_id);

create table if not exists public.db_tables (
    id text not null,
    diagram_id text not null references public.diagrams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id, diagram_id)
);

create table if not exists public.db_relationships (
    id text not null,
    diagram_id text not null references public.diagrams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id, diagram_id)
);

create table if not exists public.db_dependencies (
    id text not null,
    diagram_id text not null references public.diagrams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id, diagram_id)
);

create table if not exists public.areas (
    id text not null,
    diagram_id text not null references public.diagrams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id, diagram_id)
);

create table if not exists public.db_custom_types (
    id text not null,
    diagram_id text not null references public.diagrams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id, diagram_id)
);

create table if not exists public.notes (
    id text not null,
    diagram_id text not null references public.diagrams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id, diagram_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diagrams_set_updated_at on public.diagrams;
create trigger diagrams_set_updated_at
before update on public.diagrams
for each row execute function public.set_updated_at();

alter table public.diagrams enable row level security;
alter table public.db_tables enable row level security;
alter table public.db_relationships enable row level security;
alter table public.db_dependencies enable row level security;
alter table public.areas enable row level security;
alter table public.db_custom_types enable row level security;
alter table public.notes enable row level security;

create policy "diagrams_select_own" on public.diagrams for select using (auth.uid() = user_id);
create policy "diagrams_insert_own" on public.diagrams for insert with check (auth.uid() = user_id);
create policy "diagrams_update_own" on public.diagrams for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diagrams_delete_own" on public.diagrams for delete using (auth.uid() = user_id);

create policy "db_tables_select_own" on public.db_tables for select using (auth.uid() = user_id);
create policy "db_tables_insert_own" on public.db_tables for insert with check (auth.uid() = user_id);
create policy "db_tables_update_own" on public.db_tables for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "db_tables_delete_own" on public.db_tables for delete using (auth.uid() = user_id);

create policy "db_relationships_select_own" on public.db_relationships for select using (auth.uid() = user_id);
create policy "db_relationships_insert_own" on public.db_relationships for insert with check (auth.uid() = user_id);
create policy "db_relationships_update_own" on public.db_relationships for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "db_relationships_delete_own" on public.db_relationships for delete using (auth.uid() = user_id);

create policy "db_dependencies_select_own" on public.db_dependencies for select using (auth.uid() = user_id);
create policy "db_dependencies_insert_own" on public.db_dependencies for insert with check (auth.uid() = user_id);
create policy "db_dependencies_update_own" on public.db_dependencies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "db_dependencies_delete_own" on public.db_dependencies for delete using (auth.uid() = user_id);

create policy "areas_select_own" on public.areas for select using (auth.uid() = user_id);
create policy "areas_insert_own" on public.areas for insert with check (auth.uid() = user_id);
create policy "areas_update_own" on public.areas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "areas_delete_own" on public.areas for delete using (auth.uid() = user_id);

create policy "db_custom_types_select_own" on public.db_custom_types for select using (auth.uid() = user_id);
create policy "db_custom_types_insert_own" on public.db_custom_types for insert with check (auth.uid() = user_id);
create policy "db_custom_types_update_own" on public.db_custom_types for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "db_custom_types_delete_own" on public.db_custom_types for delete using (auth.uid() = user_id);

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);
```

## Variables de entorno

```bash
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```
