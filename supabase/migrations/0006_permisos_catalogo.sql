-- El historial del chofer muestra la patente del camión de cada viaje, y el
-- formulario podría necesitar listarlas. Las patentes no son información
-- sensible, así que se abre la lectura de `camiones` a cualquier sesión
-- autenticada (chofer o jefe). La administración sigue siendo solo del jefe.

create policy camiones_select_authenticated on camiones
  for select using (auth.role() = 'authenticated');
