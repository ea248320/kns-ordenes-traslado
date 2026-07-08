// Login del chofer: RUT + patente, sin contraseña.
// Valida contra los catálogos `choferes` y `camiones` (con service_role,
// que salta RLS a propósito -- este endpoint es el único lugar donde se
// necesita ver esas tablas antes de tener una sesión) y devuelve un JWT
// propio, firmado con el JWT secret del proyecto, con claims custom
// (tipo_usuario, chofer_id, camion_id) que las políticas RLS de
// supabase/migrations/0002_rls_policies.sql usan para filtrar `traslados`.
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

function normalizarRut(rut: string) {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

function normalizarPatente(patente: string) {
  return patente.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function firmarJwtHS256(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return `${data}.${base64url(signature)}`
}

const DURACION_SESION_SEGUNDOS = 60 * 60 * 16 // ~16h, un turno largo de chofer

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido' }, 405)

  let rut: unknown, patente: unknown
  try {
    ;({ rut, patente } = await req.json())
  } catch {
    return jsonResponse({ error: 'Body inválido, se espera JSON { rut, patente }' }, 400)
  }

  if (typeof rut !== 'string' || typeof patente !== 'string' || !rut.trim() || !patente.trim()) {
    return jsonResponse({ error: 'Falta RUT o patente' }, 400)
  }

  const rutNormalizado = normalizarRut(rut)
  const patenteNormalizada = normalizarPatente(patente)

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const [{ data: chofer, error: choferError }, { data: camion, error: camionError }] = await Promise.all([
    supabaseAdmin.from('choferes').select('id, nombre, activo').eq('rut', rutNormalizado).maybeSingle(),
    supabaseAdmin.from('camiones').select('id, patente, activo').eq('patente', patenteNormalizada).maybeSingle(),
  ])

  if (choferError || camionError) {
    console.error('login-chofer db error', choferError, camionError)
    return jsonResponse({ error: 'Error validando credenciales' }, 500)
  }

  if (!chofer || !chofer.activo) return jsonResponse({ error: 'RUT no registrado o inactivo' }, 401)
  if (!camion || !camion.activo) return jsonResponse({ error: 'Patente no registrada o inactiva' }, 401)

  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')
  if (!jwtSecret) {
    console.error('Falta el secret SUPABASE_JWT_SECRET en esta función')
    return jsonResponse({ error: 'Configuración del servidor incompleta' }, 500)
  }

  const ahora = Math.floor(Date.now() / 1000)
  const token = await firmarJwtHS256(
    {
      role: 'authenticated',
      sub: chofer.id,
      tipo_usuario: 'chofer',
      chofer_id: chofer.id,
      camion_id: camion.id,
      iat: ahora,
      exp: ahora + DURACION_SESION_SEGUNDOS,
    },
    jwtSecret,
  )

  return jsonResponse({
    access_token: token,
    expires_at: ahora + DURACION_SESION_SEGUNDOS,
    chofer: { id: chofer.id, nombre: chofer.nombre },
    camion: { id: camion.id, patente: camion.patente },
  })
})
