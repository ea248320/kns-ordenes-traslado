-- Historial de ediciones: cada UPDATE de un jefe sobre un traslado queda
-- registrado con quién, cuándo y qué campos cambiaron.

create table traslados_auditoria (
  id           uuid primary key default gen_random_uuid(),
  traslado_id  uuid not null references traslados (id) on delete cascade,
  editado_por  uuid not null references auth.users (id),
  editado_en   timestamptz not null default now(),
  cambios      jsonb not null -- { "campo": { "antes": ..., "despues": ... }, ... }
);

create index traslados_auditoria_traslado_id_idx on traslados_auditoria (traslado_id);

alter table traslados_auditoria enable row level security;

-- Solo lectura para el jefe; nadie inserta directamente (lo hace el trigger
-- de más abajo, que corre con privilegios de definer y por eso no necesita
-- una policy de INSERT propia).
create policy traslados_auditoria_jefe_select on traslados_auditoria
  for select using (is_jefe());

-- Columnas de negocio que nos interesa auditar (se excluyen las generadas
-- kg_neto/km_recorrido y actualizado_en, que son derivadas/automáticas).
create function registrar_auditoria_traslado()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  cambios jsonb := '{}'::jsonb;
  campos text[] := array[
    'fecha', 'chofer_id', 'camion_id', 'cliente_id',
    'direccion_inicial', 'direccion_final', 'numero_guia', 'producto',
    'kg_inicial', 'kg_final', 'km_inicial', 'km_final'
  ];
  campo text;
  valor_anterior text;
  valor_nuevo text;
begin
  foreach campo in array campos loop
    execute format('select ($1).%I::text, ($2).%I::text', campo, campo)
      into valor_anterior, valor_nuevo
      using old, new;

    if valor_anterior is distinct from valor_nuevo then
      cambios := cambios || jsonb_build_object(
        campo, jsonb_build_object('antes', valor_anterior, 'despues', valor_nuevo)
      );
    end if;
  end loop;

  if cambios <> '{}'::jsonb then
    insert into traslados_auditoria (traslado_id, editado_por, cambios)
    values (new.id, auth.uid(), cambios);
  end if;

  return new;
end;
$$;

create trigger traslados_after_update_auditoria
  after update on traslados
  for each row
  execute function registrar_auditoria_traslado();
