-- Cambio de negocio: la columna kg_neto deja de ser la diferencia
-- (kg_final - kg_inicial) y pasa a ser el PROMEDIO de ambas pesadas:
-- (kg_inicial + kg_final) / 2. Ej: inicial 100, final 200 → 150.
-- km_recorrido no cambia (sigue siendo diferencia de odómetro).
--
-- Es columna generada, y Postgres no permite alterar su expresión: hay que
-- botarla y recrearla. Las vistas que la referencian deben botarse antes y
-- recrearse después (idénticas a 0005).

drop view if exists v_traslados_detalle;
drop view if exists v_alertas_kg_km_invalidos;

alter table traslados drop column kg_neto;
alter table traslados add column kg_neto numeric(10, 2)
  generated always as ((kg_inicial + kg_final) / 2) stored;

create or replace view v_traslados_detalle as
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

alter view v_traslados_detalle set (security_invoker = true);

create or replace view v_alertas_kg_km_invalidos as
select id, numero_orden, fecha, chofer_id, camion_id, kg_neto, km_recorrido
from traslados
where kg_neto <= 0 or km_recorrido <= 0;

alter view v_alertas_kg_km_invalidos set (security_invoker = true);

grant select on v_traslados_detalle, v_alertas_kg_km_invalidos to authenticated;
