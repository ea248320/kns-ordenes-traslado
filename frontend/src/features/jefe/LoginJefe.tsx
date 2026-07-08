import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface Props {
  onVolver: () => void
}

export default function LoginJefe({ onVolver }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (authError) setError('Correo o contraseña incorrectos')
    // Si funciona, onAuthStateChange en useAuth cambia la vista solo.
  }

  return (
    <div className="pantalla-centrada">
      <form className="tarjeta formulario-login" onSubmit={handleSubmit}>
        <h2>Ingreso Jefe de Transportes</h2>
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
