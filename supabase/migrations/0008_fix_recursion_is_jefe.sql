-- Bug: is_jefe() consulta `perfiles`, pero `perfiles` tiene una política que
-- llama a is_jefe() para decidir qué filas son visibles → recursión infinita
-- ("stack depth limit exceeded") cada vez que se evalúa cualquier policy que
-- use is_jefe() (por ejemplo, al insertar un traslado como chofer, porque
-- también se evalúa el WITH CHECK de la policy del jefe).
--
-- Fix: is_jefe() se ejecuta como SECURITY DEFINER (dueño de la función, el
-- rol postgres), así su consulta interna a `perfiles` no vuelve a pasar por
-- RLS y no se re-invoca a sí misma.
create or replace function is_jefe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid()
      and rol in ('jefe', 'admin')
  );
$$;
