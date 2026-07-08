import { useState, type FormEvent } from 'react'
import type { SesionChofer } from '../../auth/useAuth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface Props {
  onLogin: (sesion: SesionChofer) => void
  onVolver: () => void
}

export default function LoginChofer({ onLogin, onVolver }: Props) {
  const [rut, setRut] = useState('')
  const [patente, setPatente] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/login-chofer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey },
        body: JSON.stringify({ rut, patente }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'No se pudo iniciar sesión')
        return
      }
      onLogin(body as SesionChofer)
    } catch {
      setError('Sin conexión. Necesitas señal para iniciar sesión la primera vez.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="pantalla-centrada">
      <form className="tarjeta formulario-login" onSubmit={handleSubmit}>
        <h2>Ingreso Chofer</h2>
        <label>
          RUT
          <input
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="12.345.678-9"
            autoComplete="off"
            required
          />
        </label>
        <label>
          Patente del camión
          <input
            value={patente}
            onChange={(e) => setPatente(e.target.value)}
            placeholder="AB-1234"
            autoComplete="off"
            required
          />
        </label>
        {error && <p className="mensaje-error">{error}</p>}
        <button type="submit" disabled={cargando}>
          {cargando ? 'Verificando…' : 'Entrar'}
        </button>
        <button type="button" className="boton-secundario" onClick={onVolver}>
          Volver
        </button>
      </form>
    </div>
  )
}
