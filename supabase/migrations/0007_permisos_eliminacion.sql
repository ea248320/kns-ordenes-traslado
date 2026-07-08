-- El jefe puede eliminar registros desde su panel. choferes y camiones ya
-- quedan cubiertos por sus policies "for all"; faltaban clientes y traslados.
-- (la UI advierte antes de eliminar; los catálogos con historial asociado
-- fallarán por FK y la UI ofrece desactivar en su lugar)

drop policy if exists clientes_jefe_delete on clientes;
create policy clientes_jefe_delete on clientes
  for delete using (is_jefe());

drop policy if exists traslados_jefe_delete on traslados;
create policy traslados_jefe_delete on traslados
  for delete using (is_jefe());
