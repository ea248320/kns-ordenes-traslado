import { useEffect, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { encolarTraslado, syncCompleto } from '../../lib/sync'
import type { SesionChofer } from '../../auth/useAuth'
import type { ProductoTipo } from '../../types/database'

interface Props {
  sesion: SesionChofer
}

const HOY = () => new Date().toISOString().slice(0, 10)

export default function FormularioTraslado({ sesion }: Props) {
  const clientes = useLiveQuery(() => db.clientes.orderBy('nombre').toArray(), []) ?? []

  const [fecha, setFecha] = useState(HOY)
  const [clienteId, setClienteId] = useState('')
  const [direccionInicial, setDireccionInicial] = useState('')
  const [direccionFinal, setDireccionFinal] = useState('')
  const [numeroGuia, setNumeroGuia] = useState('')
  const [producto, setProducto] = useState<ProductoTipo>('trigo')
  const [kgInicial, setKgInicial] = useState('')
  const [kgFinal, setKgFinal] = useState('')
  const [kmInicial, setKmInicial] = useState('')
  const [kmFinal, setKmFinal] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const primerClienteId = clientes[0]?.id
  useEffect(() => {
    if (!clienteId && primerClienteId) setClienteId(primerClienteId)
  }, [primerClienteId, clienteId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMensaje(null)

    const cliente = clientes.find((c) => c.id === clienteId)
    if (!cliente) {
      setMensaje('Selecciona un cliente. Si la lista está vacía, sincroniza con señal al menos una vez.')
      return
    }

    setGuardando(true)
    try {
      await encolarTraslado({
        client_uuid: crypto.randomUUID(),
        fecha,
        chofer_id: sesion.chofer.id,
        camion_id: sesion.camion.id,
        camion_patente: sesion.camion.patente,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        direccion_inicial: direccionInicial.trim(),
        direccion_final: direccionFinal.trim(),
        numero_guia: numeroGuia.trim(),
        producto,
        kg_inicial: Number(kgInicial),
        kg_final: Number(kgFinal),
        km_inicial: Number(kmInicial),
        km_final: Number(kmFinal),
        creado_en: new Date().toISOString(),
      })

      // Limpia los campos del viaje; mantiene fecha y direcciones, que suelen
      // repetirse entre viajes consecutivos del mismo día.
      setNumeroGuia('')
      setKgInicial('')
      setKgFinal('')
      setKmInicial('')
      setKmFinal('')

      if (navigator.onLine) {
        const resultado = await syncCompleto(sesion)
        if (resultado.sesionExpirada) {
          setMensaje('Traslado guardado en el teléfono. Tu sesión expiró: vuelve a ingresar para sincronizar.')
        } else if (resultado.errores.length > 0) {
          setMensaje(`Traslado guardado, pero hubo un problema al sincronizar: ${resultado.errores[0]}`)
        } else {
          setMensaje('Traslado registrado y sincronizado ✓')
        }
      } else {
        setMensaje('Traslado guardado en el teléfono. Se subirá automáticamente cuando vuelva la señal.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="tarjeta" onSubmit={handleSubmit}>
      <h3>Nueva orden de traslado</h3>
      <p className="texto-suave">
        Camión {sesion.camion.patente} · {sesion.chofer.nombre}
      </p>

      <div className="grilla-2">
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label>
          Cliente
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
            {clientes.length === 0 && <option value="">(sin clientes aún)</option>}
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Dirección inicial
        <input value={direccionInicial} onChange={(e) => setDireccionInicial(e.target.value)} required />
      </label>
      <label>
        Dirección final
        <input value={direccionFinal} onChange={(e) => setDireccionFinal(e.target.value)} required />
      </label>

      <div className="grilla-2">
        <label>
          N° de guía
          <input value={numeroGuia} onChange={(e) => setNumeroGuia(e.target.value)} required />
        </label>
        <label>
          Producto
          <select value={producto} onChange={(e) => setProducto(e.target.value as ProductoTipo)}>
            <option value="trigo">Trigo</option>
            <option value="avena">Avena</option>
            <option value="raps">Raps</option>
          </select>
        </label>
      </div>

      <div className="grilla-2">
        <label>
          Kg inicial
          <input type="number" step="any" inputMode="decimal" value={kgInicial} onChange={(e) => setKgInicial(e.target.value)} required />
        </label>
        <label>
          Kg final
          <input type="number" step="any" inputMode="decimal" value={kgFinal} onChange={(e) => setKgFinal(e.target.value)} required />
        </label>
      </div>
      <div className="grilla-2">
        <label>
          Km inicial
          <input type="number" step="any" inputMode="decimal" value={kmInicial} onChange={(e) => setKmInicial(e.target.value)} required />
        </label>
        <label>
          Km final
          <input type="number" step="any" inputMode="decimal" value={kmFinal} onChange={(e) => setKmFinal(e.target.value)} required />
        </label>
      </div>

      {mensaje && <p className="mensaje-info">{mensaje}</p>}

      <button type="submit" disabled={guardando}>
        {guardando ? 'Guardando…' : 'Registrar traslado'}
      </button>
    </form>
  )
}
