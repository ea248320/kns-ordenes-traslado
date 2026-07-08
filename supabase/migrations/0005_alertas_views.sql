-- Vista denormalizada (para que el dashboard filtre/agrupe sin tener que
-- repetir los joins en cada query) + funciones/vistas de alertas.
-- Las agregaciones específicas de cada gráfico (composición por producto,
-- ranking por camión/chofer, top clientes, evolución temporal) se calculan
-- en la Fase de Dashboard a partir de v_traslados_detalle, que ya trae todo
-- lo necesario para agrupar por cualquiera de los filtros combinables.

-- Pensada para el dashboard del jefe: choferes/camiones solo son legibles por
-- el jefe (ver 0002), así que para una sesión de chofer los INNER JOIN no
-- devuelven filas. El historial propio del chofer debe leer directo de
-- traslados + clientes (ambas sí visibles para su rol), no de esta vista.
create view v_traslados_detalle as
select
  t.id,
  t.numero_orden,
  t.fecha,
  t.chofer_id,
  ch.nombre as chofer_nombre,
  t.camion_id,
  ca.patente as camion_patente,
  t.cliente_id,
  cl.nombre as cliente_nombre,
  t.direccion_inicial,
  t.direccion_final,
  t.numero_guia,
  t.producto,
  t.kg_inicial,
  t.kg_final,
  t.kg_neto,
  t.km_inicial,
  t.km_final,
  t.km_recorrido,
  t.creado_por_tipo,
  t.creado_en,
  t.actualizado_en
from traslados t
join choferes ch on ch.id = t.chofer_id
join camiones ca on ca.id = t.camion_id
join clientes cl on cl.id = t.cliente_id;

-- El jefe ve todo (RLS de la vista hereda de traslados/choferes/camiones/clientes
-- vía security_invoker, disponible desde Postgres 15).
alter view v_traslados_detalle set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Alertas: guías duplicadas
-- ---------------------------------------------------------------------------

create view v_alertas_guias_duplicadas as
select
  numero_guia,
  count(*) as cantidad,
  array_agg(id order by fecha) as traslado_ids
from traslados
group by numero_guia
having count(*) > 1;

-- Sin esto, la vista corre con permisos del dueño (postgres) y se saltaría
-- la RLS de traslados, filtrando datos de todos los choferes a cualquiera.
alter view v_alertas_guias_duplicadas set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Alertas: kg/km en cero o negativos
-- ---------------------------------------------------------------------------

create view v_alertas_kg_km_invalidos as
select id, numero_orden, fecha, chofer_id, camion_id, kg_neto, km_recorrido
from traslados
where kg_neto <= 0 or km_recorrido <= 0;

alter view v_alertas_kg_km_invalidos set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Alertas: camión sin registrar fletes en los últimos N días
-- ---------------------------------------------------------------------------

create function alertas_camiones_inactivos(dias_umbral int default 3)
returns table (
  camion_id uuid,
  patente text,
  ultima_fecha date,
  dias_sin_actividad int
)
language sql
stable
as $$
  select
    c.id,
    c.patente,
    max(t.fecha) as ultima_fecha,
    coalesce((current_date - max(t.fecha))::int, dias_umbral + 1) as dias_sin_actividad
  from camiones c
  left join traslados t on t.camion_id = c.id
  where c.activo
  group by c.id, c.patente
  having max(t.fecha) is null or current_date - max(t.fecha) > dias_umbral;
$$;

-- ---------------------------------------------------------------------------
-- Alertas: número inusual de fletes de un chofer en un mismo día
-- ---------------------------------------------------------------------------

create function alertas_fletes_atipicos_chofer(umbral_diario int default 12)
returns table (
  chofer_id uuid,
  chofer_nombre text,
  fecha date,
  cantidad_fletes bigint
)
language sql
stable
as $$
  select t.chofer_id, ch.nombre, t.fecha, count(*) as cantidad_fletes
  from traslados t
  join choferes ch on ch.id = t.chofer_id
  group by t.chofer_id, ch.nombre, t.fecha
  having count(*) > umbral_diario;
$$;

-- Supabase agrega grants por default a objetos nuevos en public, pero lo
-- dejamos explícito para no depender de esa configuración del proyecto.
-- La protección real de "solo el jefe puede leer esto" la dan las RLS de
-- las tablas subyacentes (security_invoker en la vista, is_jefe() en las
-- funciones se podría añadir si se quisiera bloquear también a nivel de
-- función; se deja abierto a authenticated porque un chofer no tiene forma
-- de invocar RPC fuera de lo que la UI expone, y aun si lo hiciera, no verá
-- filas que no sean RLS-visibles a través de las tablas base).
grant select on v_traslados_detalle, v_alertas_guias_duplicadas, v_alertas_kg_km_invalidos
  to authenticated;
grant execute on function alertas_camiones_inactivos(int) to authenticated;
grant execute on function alertas_fletes_atipicos_chofer(int) to authenticated;
