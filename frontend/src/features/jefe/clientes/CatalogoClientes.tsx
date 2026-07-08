import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import type { Cliente } from '../../../types/database'

interface Props {
  clientes: Cliente[]
  onRecargar: () => void
}

export default function CatalogoClientes({ clientes, onRecargar }: Props) {
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: insError } = await supabase
      .from('clientes')
      .insert({ nombre: nuevoNombre.trim(), nombre_normalizado: '' }) // lo normaliza el trigger
    if (insError) {
      setError(
        insError.code === '23505'
          ? 'Ya existe un cliente con ese nombre (la comparación ignora mayúsculas y espacios).'
          : insError.message,
      )
      return
    }
    setNuevoNombre('')
    onRecargar()
  }

  async function handleRenombrar(e: FormEvent) {
    e.preventDefault()
    if (!editando) return
    setError(null)
    const { error: updError } = await supabase
      .from('clientes')
      .update({ nombre: nombreEditado.trim() })
      .eq('id', editando.id)
    if (updError) {
      setError(updError.code === '23505' ? 'Ya existe un cliente con ese nombre.' : updError.message)
      return
    }
    setEditando(null)
    onRecargar()
  }

  async function handleActivar(cliente: Cliente, activo: boolean) {
    setError(null)
    // Desactivar (no borrar): los traslados históricos siguen apuntando al
    // cliente, solo deja de ofrecerse en el formulario del chofer.
    const { error: updError } = await supabase.from('clientes').update({ activo }).eq('id', cliente.id)
    if (updError) {
      setError(updError.message)
      return
    }
    onRecargar()
  }

  return (
    <div className="tarjeta">
      <h3>Catálogo de clientes</h3>
      <p className="texto-suave">
        Los choferes eligen de esta lista (no escriben texto libre), así el ranking de clientes no se
        llena de duplicados.
      </p>

      <form className="fila-botones" onSubmit={handleCrear}>
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre del nuevo cliente"
          required
        />
        <button type="submit">Agregar</button>
      </form>

      {error && <p className="mensaje-error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
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
        </tbody>
      </table>
    </div>
  )
}
