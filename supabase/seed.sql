-- Datos de prueba para desarrollo local / staging.
-- No corras esto en producción con datos reales de la empresa.

insert into choferes (rut, nombre) values
  ('11.111.111-1', 'Juan Pérez'),
  ('22.222.222-2', 'Pedro Soto'),
  ('33.333.333-3', 'Ana Muñoz');

insert into camiones (patente) values
  ('AB-1234'),
  ('CD-5678'),
  ('EF-9012');

insert into clientes (nombre) values
  ('Agrícola Sur Ltda.'),
  ('Molinos del Valle'),
  ('Exportadora Los Andes');

-- El perfil de "jefe" no se puede sembrar por SQL directo porque depende de
-- un usuario real en auth.users. Pasos manuales tras crear tu primer usuario
-- jefe (Authentication > Users > Add user, en el dashboard de Supabase):
--
--   insert into perfiles (id, nombre, rol)
--   values ('<uuid-del-usuario-creado>', 'Nombre del Jefe', 'jefe');
