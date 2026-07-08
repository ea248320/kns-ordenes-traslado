-- Esquema base: catálogos (choferes, camiones, clientes), perfiles de jefe,
-- y la tabla central de traslados.

create extension if not exists pgcrypto;

create type producto_tipo as enum ('trigo', 'avena', 'raps');

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------

create table choferes (
  id         uuid primary key default gen_random_uuid(),
  rut        text not null unique,
  nombre     text not null,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table camiones (
  id         uuid primary key default gen_random_uuid(),
  patente    text not null unique,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

create table clientes (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  nombre_normalizado  text not null,
  activo              boolean not null default true,
  creado_en           timestamptz not null default now()
);

-- Evita duplicados como "Agrícola Sur" vs "agricola sur " en el ranking de clientes.
create unique index clientes_nombre_normalizado_activo_idx
  on clientes (nombre_normalizado)
  where activo;

-- Perfiles de usuarios "jefe" (se apoyan en auth.users de Supabase Auth).
create table perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text,
  rol        text not null check (rol in ('jefe', 'admin')),
  creado_en  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Traslados (la orden de traslado digital)
-- ---------------------------------------------------------------------------

create table traslados (
  id                 uuid primary key default gen_random_uuid(),

  -- Generado en el dispositivo del chofer al crear el registro offline.
  -- Permite que la sincronización sea idempotente: si el mismo registro
  -- se reenvía dos veces (falla de red a mitad de sync), se deduplica aquí
  -- en vez de crear un traslado repetido.
  client_uuid        uuid not null unique,

  numero_orden       bigint unique, -- lo asigna un trigger (ver 0003)

  fecha              date not null,
  chofer_id          uuid not null references choferes (id),
  camion_id          uuid not null references camiones (id),
  cliente_id         uuid not null references clientes (id),

  direccion_inicial  text not null,
  direccion_final    text not null,
  numero_guia        text not null,
  producto           producto_tipo not null,

  kg_inicial         numeric(10, 2) not null,
  kg_final           numeric(10, 2) not null,
  km_inicial         numeric(10, 2) not null,
  km_final           numeric(10, 2) not null,

  -- Generadas para no recalcular en cada query del dashboard.
  -- Nota: no se restringen a >= 0 a propósito: valores negativos o cero
  -- deben poder guardarse para que el jefe los vea como alerta (ver 0005),
  -- en vez de bloquear el registro del chofer en terreno.
  kg_neto            numeric(10, 2) generated always as (kg_final - kg_inicial) stored,
  km_recorrido       numeric(10, 2) generated always as (km_final - km_inicial) stored,

  creado_por_tipo    text not null default 'chofer' check (creado_por_tipo in ('chofer', 'jefe')),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now()
);

create index traslados_fecha_idx on traslados (fecha);
create index traslados_chofer_id_idx on traslados (chofer_id);
create index traslados_camion_id_idx on traslados (camion_id);
create index traslados_cliente_id_idx on traslados (cliente_id);
create index traslados_producto_idx on traslados (producto);
create index traslados_numero_guia_idx on traslados (numero_guia);

create function set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger traslados_set_actualizado_en
  before update on traslados
  for each row
  execute function set_actualizado_en();
