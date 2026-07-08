-- Para listar administradores en el panel hace falta mostrar su correo, pero
-- `auth.users` no es consultable desde el cliente (por diseño de Supabase).
-- Se guarda una copia del email en `perfiles` al momento de crear la cuenta.
alter table perfiles add column if not exists email text;
