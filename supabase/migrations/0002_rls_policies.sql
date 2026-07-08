-- Row Level Security: separa lo que ve un chofer (solo lo suyo, vía JWT
-- custom emitido por la Edge Function login-chofer) de lo que ve un jefe
-- (todo, vía Supabase Auth normal + tabla perfiles).

-- ---------------------------------------------------------------------------
-- Funciones helper
-- ---------------------------------------------------------------------------

create function is_jefe()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid()
      and rol in ('jefe', 'admin')
  );
$$;

-- El chofer no pasa por Supabase Auth: login-chofer le entrega un JWT propio,
-- firmado con el mismo JWT secret del proyecto, con claims custom
-- (tipo_usuario, chofer_id, camion_id) y role: authenticated para que
-- PostgREST lo acepte igual que a un usuario de Supabase Auth.
create function jwt_tipo_usuario()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'tipo_usuario';
$$;

create function jwt_chofer_id()
returns uuid
language sql
stable
as $$
  select (auth.jwt() ->> 'chofer_id')::uuid;
$$;

create function jwt_camion_id()
returns uuid
language sql
stable
as $$
  select (auth.jwt() ->> 'camion_id')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- choferes / camiones: solo el jefe administra estos catálogos.
-- ---------------------------------------------------------------------------

alter table choferes enable row level security;
alter table camiones enable row level security;

create policy choferes_jefe_all on choferes
  for all using (is_jefe()) with check (is_jefe());

create policy camiones_jefe_all on camiones
  for all using (is_jefe()) with check (is_jefe());

-- ---------------------------------------------------------------------------
-- clientes: catálogo de lectura para cualquier sesión autenticada (chofer o
-- jefe, para el autocompletado del formulario); solo el jefe lo administra.
-- ---------------------------------------------------------------------------

alter table clientes enable row level security;

create policy clientes_select_authenticated on clientes
  for select using (auth.role() = 'authenticated');

create policy clientes_jefe_insert on clientes
  for insert with check (is_jefe());

create policy clientes_jefe_update on clientes
  for update using (is_jefe()) with check (is_jefe());

-- ---------------------------------------------------------------------------
-- perfiles
-- ---------------------------------------------------------------------------

alter table perfiles enable row level security;

create policy perfiles_select on perfiles
  for select using (id = auth.uid() or is_jefe());

-- ---------------------------------------------------------------------------
-- traslados: el chofer solo ve/crea lo propio; el jefe ve y edita todo.
-- ---------------------------------------------------------------------------

alter table traslados enable row level security;

create policy traslados_chofer_select on traslados
  for select using (
    jwt_tipo_usuario() = 'chofer'
    and chofer_id = jwt_chofer_id()
  );

create policy traslados_chofer_insert on traslados
  for insert with check (
    jwt_tipo_usuario() = 'chofer'
    and chofer_id = jwt_chofer_id()
    and camion_id = jwt_camion_id()
    and creado_por_tipo = 'chofer'
  );

create policy traslados_jefe_select on traslados
  for select using (is_jefe());

create policy traslados_jefe_update on traslados
  for update using (is_jefe()) with check (is_jefe());

create policy traslados_jefe_insert on traslados
  for insert with check (is_jefe() and creado_por_tipo = 'jefe');
