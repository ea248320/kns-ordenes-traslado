// Crea un nuevo usuario administrador desde el panel, sin pasar por el
// dashboard de Supabase. A diferencia de login-chofer, esta función SÍ exige
// JWT válido (Verify JWT queda ON): solo un administrador con sesión activa
// puede invocarla. Además de traer sesión, se verifica que su perfil tenga
// rol jefe/admin -- si no, cualquier usuario autenticado podría crear otros
// administradores.
//
// El usuario se crea con email_confirm: true, así queda operativo de
// inmediato (el problema típico al crearlo manualmente desde el dashboard es
// olvidar marcar "Auto Confirm User" y quedar bloqueado hasta confirmar el
// correo).
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

  // Cliente "como el llamador": sirve para validar su token y leer su propio
  // perfil (la policy perfiles_select permite id = auth.uid()).
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

  let email: unknown, password: unknown, nombre: unknown
  try {
    ;({ email, password, nombre } = await req.json())
  } catch {
    return jsonResponse({ error: 'Body inválido, se espera JSON { email, password, nombre }' }, 400)
  }

  if (typeof email !== 'string' || !email.trim()) return jsonResponse({ error: 'Falta email' }, 400)
  if (typeof password !== 'string' || password.length < 6)
    return jsonResponse({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
  if (typeof nombre !== 'string' || !nombre.trim()) return jsonResponse({ error: 'Falta nombre' }, 400)

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: creado, error: crearError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })

  if (crearError || !creado.user) {
    return jsonResponse({ error: crearError?.message ?? 'No se pudo crear el usuario' }, 400)
  }

  const { error: perfilError } = await supabaseAdmin.from('perfiles').insert({
    id: creado.user.id,
    nombre: nombre.trim(),
    email: email.trim(),
    rol: 'jefe',
  })

  if (perfilError) {
    // El usuario de auth ya existe pero sin perfil; se revierte para no
    // dejar una cuenta a medias que nunca podrá usar el panel.
    await supabaseAdmin.auth.admin.deleteUser(creado.user.id)
    return jsonResponse({ error: `No se pudo crear el perfil: ${perfilError.message}` }, 500)
  }

  return jsonResponse({ id: creado.user.id, email: creado.user.email, nombre })
})
