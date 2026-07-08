import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import type { Perfil } from '../../../types/database'

// Alta de nuevos administradores desde el panel, sin depender del dashboard
// de Supabase (donde es fácil olvidar confirmar el correo y dejar la cuenta
// bloqueada). La creación real ocurre en la Edge Function
// crear-administrador, que valida que quien llama ya sea administrador.
export default function Administradores() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [miId, setMiId] = useState<string | null>(null)

  function recargar() {
    setCargando(true)
    supabase
      .from('perfiles')
      .select('*')
      .order('creado_en')
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message)
        else setPerfiles(data ?? [])
        setCargando(false)
      })
  }

  useEffect(recargar, [])
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMiId(data.user?.id ?? null))
  }, [])

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMensaje(null)

    if (password !== confirmarPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setCreando(true)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('crear-administrador', {
        body: { nombre: nombre.trim(), email: email.trim(), password },
      })
      if (invokeError) {
        // supabase-js no expone el body del error de una función on 4xx/5xx
        // directamente; lo intentamos leer desde el context de la respuesta.
        const detalle = await extraerMensajeError(invokeError)
        setError(detalle)
        return
      }
      if (data?.error) {
        setError(data.error)
        return
      }
      setMensaje(`Administrador "${nombre.trim()}" creado. Ya puede entrar con su correo y contraseña.`)
      setNombre('')
      setEmail('')
      setPassword('')
      setConfirmarPassword('')
      recargar()
    } finally {
      setCreando(false)
    }
  }

  async function handleEliminar(perfil: Perfil) {
    if (!window.confirm(`¿Eliminar el acceso de "${perfil.nombre ?? perfil.email}"? No podrá volver a entrar.`))
      return
    setError(null)
    setMensaje(null)
    setEliminandoId(perfil.id)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('eliminar-administrador', {
        body: { id: perfil.id },
      })
      if (invokeError) {
        setError(await extraerMensajeError(invokeError))
        return
      }
      if (data?.error) {
        setError(data.error)
        return
      }
      setMensaje(`Se eliminó el acceso de "${perfil.nombre ?? perfil.email}".`)
      recargar()
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div className="tarjeta">
      <h3>Administradores</h3>
      <p className="texto-suave">
        Cualquier administrador puede ver todos los traslados, editar registros y gestionar la flota
        y el catálogo de clientes. Crea aquí el acceso para otra persona del equipo.
      </p>

      <form onSubmit={handleCrear} className="grilla-2">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="María López" required />
        </label>
        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@knstransportes.cl"
            required
          />
        </label>
        <label>
          Contraseña inicial
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </label>
        <label>
          Confirmar contraseña
          <input
            type="password"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            placeholder="Repite la contraseña"
            minLength={6}
            required
          />
        </label>
        <button type="submit" disabled={creando} style={{ gridColumn: '1 / -1' }}>
          {creando ? 'Creando…' : 'Crear administrador'}
        </button>
      </form>

      {error && <p className="mensaje-error">{error}</p>}
      {mensaje && <p className="mensaje-info">{mensaje}</p>}

      {cargando ? (
        <p className="texto-suave">Cargando…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Desde</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {perfiles.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre ?? '—'}</td>
                <td>{p.email ?? '—'}</td>
                <td>{new Date(p.creado_en).toLocaleDateString('es-CL')}</td>
                <td>
                  {p.id === miId ? (
                    <span className="texto-suave">(tú)</span>
                  ) : (
                    <button
                      type="button"
                      className="boton-peligro"
                      disabled={eliminandoId === p.id}
                      onClick={() => handleEliminar(p)}
                    >
                      {eliminandoId === p.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

async function extraerMensajeError(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: Response }).context
    if (context instanceof Response) {
      try {
        const body = await context.clone().json()
        if (typeof body?.error === 'string') return body.error
      } catch {
        /* la respuesta no era JSON, se usa el mensaje genérico de abajo */
      }
    }
  }
  return error instanceof Error ? error.message : 'No se pudo crear el administrador'
}
