-- Correlativo automático de n° de orden + normalización de RUT/patente/cliente
-- para que los catálogos no se llenen de duplicados por formato
-- ("12.345.678-9" vs "123456789", "AB-1234" vs "ab1234").

create sequence traslados_numero_orden_seq;

create function asignar_numero_orden()
returns trigger
language plpgsql
as $$
begin
  if new.numero_orden is null then
    new.numero_orden := nextval('traslados_numero_orden_seq');
  end if;
  return new;
end;
$$;

create trigger traslados_asignar_numero_orden
  before insert on traslados
  for each row
  execute function asignar_numero_orden();

-- --- Normalización de RUT (chofer) y patente (camión) --------------------

create function normalizar_rut(rut text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(rut, '[^0-9kK]', '', 'g'));
$$;

create function normalizar_patente(patente text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(patente, '[^0-9A-Za-z]', '', 'g'));
$$;

create function choferes_normalizar()
returns trigger
language plpgsql
as $$
begin
  new.rut := normalizar_rut(new.rut);
  return new;
end;
$$;

create trigger choferes_before_insert_update
  before insert or update on choferes
  for each row
  execute function choferes_normalizar();

create function camiones_normalizar()
returns trigger
language plpgsql
as $$
begin
  new.patente := normalizar_patente(new.patente);
  return new;
end;
$$;

create trigger camiones_before_insert_update
  before insert or update on camiones
  for each row
  execute function camiones_normalizar();

-- --- Normalización de nombre de cliente (para el índice único de dedupe) --

create function clientes_normalizar()
returns trigger
language plpgsql
as $$
begin
  new.nombre_normalizado := lower(trim(regexp_replace(new.nombre, '\s+', ' ', 'g')));
  return new;
end;
$$;

create trigger clientes_before_insert_update
  before insert or update on clientes
  for each row
  execute function clientes_normalizar();
