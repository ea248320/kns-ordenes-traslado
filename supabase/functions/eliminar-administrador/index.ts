// Elimina un administrador. Igual que crear-administrador, exige JWT válido
// (Verify JWT queda ON) y que quien llama ya sea jefe/admin -- si no,
// cualquier usuario autenticado podría borrar cuentas ajenas.
//
// Se borra el usuario de auth.users con service_role; la fila de `perfiles`
// se elimina sola por el ON DELETE CASCADE de la migración 0001.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Falta sesión' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const clienteLlamador = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await clienteLlamador.auth.getUser()
  if (userError || !userData.user) return jsonResponse({ error: 'Sesión inválida' }, 401)

  const { data: perfil } = await clienteLlamador
    .from('perfiles')
    .select('rol')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (!perfil || !['jefe', 'admin'].includes(perfil.rol)) {
    return jsonResponse({ error: 'No autorizado' }, 403)
  }

  let id: unknown
  try {
    ;({ id } = await req.json())
  } catch {
    return jsonResponse({ error: 'Body inválido, se espera JSON { id }' }, 400)
  }

  if (typeof id !== 'string' || !id.trim()) return jsonResponse({ error: 'Falta id' }, 400)

  if (id === userData.user.id) {
    return jsonResponse({ error: 'No puedes eliminar tu propia cuenta mientras tienes sesión activa' }, 400)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

  if (deleteError) return jsonResponse({ error: deleteError.message }, 400)

  return jsonResponse({ ok: true })
})
