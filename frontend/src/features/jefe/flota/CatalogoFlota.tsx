import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import type { Camion, Chofer } from '../../../types/database'

interface Props {
  choferes: Chofer[]
  camiones: Camion[]
  onRecargar: () => void
}

// Administración de la flota: los choferes ingresan a la app con su RUT y la
// patente del camión que usan ese día, así que ambos deben existir aquí y
// estar activos para que el login funcione.
export default function CatalogoFlota({ choferes, camiones, onRecargar }: Props) {
  return (
    <div className="grilla-graficos">
      <TarjetaChoferes choferes={choferes} onRecargar={onRecargar} />
      <TarjetaCamiones camiones={camiones} onRecargar={onRecargar} />
    </div>
  )
}

function TarjetaChoferes({ choferes, onRecargar }: { choferes: Chofer[]; onRecargar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [rut, setRut] = useState('')
  const [editando, setEditando] = useState<Chofer | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: insError } = await supabase
      .from('choferes')
      .insert({ nombre: nombre.trim(), rut: rut.trim() })
    if (insError) {
      setError(insError.code === '23505' ? 'Ya existe un chofer con ese RUT.' : insError.message)
      return
    }
    setNombre('')
    setRut('')
    onRecargar()
  }

  async function handleRenombrar(e: FormEvent) {
    e.preventDefault()
    if (!editando) return
    setError(null)
    const { error: updError } = await supabase
      .from('choferes')
      .update({ nombre: nombreEditado.trim() })
      .eq('id', editando.id)
    if (updError) {
      setError(updError.message)
      return
    }
    setEditando(null)
    onRecargar()
  }

  async function handleActivar(chofer: Chofer, activo: boolean) {
    setError(null)
    // Desactivar en vez de borrar: sus traslados históricos se conservan,
    // solo se le bloquea el ingreso a la app.
    const { error: updError } = await supabase.from('choferes').update({ activo }).eq('id', chofer.id)
    if (updError) {
      setError(updError.message)
      return
    }
    onRecargar()
  }

  return (
    <div className="tarjeta">
      <h3>Choferes</h3>
      <p className="texto-suave">
        El chofer ingresa a la app con su RUT (más la patente del camión). Solo pueden entrar los
        choferes activos de esta lista.
      </p>

      <form onSubmit={handleCrear} className="grilla-2">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan Pérez" required />
        </label>
        <label>
          RUT
          <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" required />
        </label>
        <button type="submit" style={{ gridColumn: '1 / -1' }}>
          Agregar chofer
        </button>
      </form>

      {error && <p className="mensaje-error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>RUT</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {choferes.map((c) => (
            <tr key={c.id}>
              <td>
                {editando?.id === c.id ? (
                  <form onSubmit={handleRenombrar} className="fila-botones">
                    <input value={nombreEditado} onChange={(e) => setNombreEditado(e.target.value)} autoFocus />
                    <button type="submit">OK</button>
                    <button type="button" className="boton-secundario" onClick={() => setEditando(null)}>
                      ✕
                    </button>
                  </form>
                ) : (
                  c.nombre
                )}
              </td>
              <td>{formatearRut(c.rut)}</td>
              <td>
                <span className={c.activo ? 'chip chip-ok' : 'chip chip-pendiente'}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="fila-botones">
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => {
                    setEditando(c)
                    setNombreEditado(c.nombre)
                  }}
                >
                  Renombrar
                </button>
                <button type="button" className="boton-secundario" onClick={() => handleActivar(c, !c.activo)}>
                  {c.activo ? 'Desactivar' : 'Reactivar'}
                </button>
              </td>
            </tr>
          ))}
          {choferes.length === 0 && (
            <tr>
              <td colSpan={4} className="texto-suave">
                Aún no hay choferes registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function TarjetaCamiones({ camiones, onRecargar }: { camiones: Camion[]; onRecargar: () => void }) {
  const [patente, setPatente] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: insError } = await supabase.from('camiones').insert({ patente: patente.trim() })
    if (insError) {
      setError(insError.code === '23505' ? 'Esa patente ya está registrada.' : insError.message)
      return
    }
    setPatente('')
    onRecargar()
  }

  async function handleActivar(camion: Camion, activo: boolean) {
    setError(null)
    const { error: updError } = await supabase.from('camiones').update({ activo }).eq('id', camion.id)
    if (updError) {
      setError(updError.message)
      return
    }
    onRecargar()
  }

  return (
    <div className="tarjeta">
      <h3>Camiones</h3>
      <p className="texto-suave">
        La patente que el chofer escribe al ingresar debe existir aquí y estar activa. Se guarda
        normalizada (sin guiones ni espacios).
      </p>

      <form onSubmit={handleCrear} className="fila-botones">
        <input
          value={patente}
          onChange={(e) => setPatente(e.target.value)}
          placeholder="AB-1234"
          required
        />
        <button type="submit">Agregar camión</button>
      </form>

      {error && <p className="mensaje-error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Patente</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {camiones.map((c) => (
            <tr key={c.id}>
              <td>{c.patente}</td>
              <td>
                <span className={c.activo ? 'chip chip-ok' : 'chip chip-pendiente'}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="fila-botones">
                <button type="button" className="boton-secundario" onClick={() => handleActivar(c, !c.activo)}>
                  {c.activo ? 'Desactivar' : 'Reactivar'}
                </button>
              </td>
            </tr>
          ))}
          {camiones.length === 0 && (
            <tr>
              <td colSpan={3} className="texto-suave">
                Aún no hay camiones registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/** "111111111" → "11.111.111-1" solo para mostrar. */
function formatearRut(rut: string): string {
  if (rut.length < 2) return rut
  const cuerpo = rut.slice(0, -1)
  const dv = rut.slice(-1)
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}
