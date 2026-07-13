import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { syncCompleto } from '../../lib/sync'
import type { SesionChofer } from '../../auth/useAuth'

interface Props {
  sesion: SesionChofer
}

export default function HistorialChofer({ sesion }: Props) {
  const pendientes = useLiveQuery(() => db.outbox.orderBy('creado_en').reverse().toArray(), []) ?? []
  const sincronizados =
    useLiveQuery(() => db.historial.orderBy('creado_en').reverse().toArray(), []) ?? []
  const [sincronizando, setSincronizando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  // Un registro puede estar en ambos lados un instante (subido pero aún en
  // outbox); el client_uuid evita mostrarlo duplicado.
  const uuidsSincronizados = new Set(sincronizados.map((t) => t.client_uuid))
  const soloPendientes = pendientes.filter((p) => !uuidsSincronizados.has(p.client_uuid))

  async function handleSincronizar() {
    setMensaje(null)
    if (!navigator.onLine) {
      setMensaje('Sin señal. Los viajes pendientes se subirán cuando vuelva la conexión.')
      return
    }
    setSincronizando(true)
    try {
      const resultado = await syncCompleto(sesion)
      if (resultado.sesionExpirada) {
        setMensaje('Tu sesión expiró. Cierra sesión y vuelve a ingresar con tu RUT y patente.')
      } else if (resultado.errores.length > 0) {
        setMensaje(`Sincronizado con errores: ${resultado.errores.join(' · ')}`)
      } else {
        setMensaje(resultado.subidos > 0 ? `${resultado.subidos} viaje(s) subido(s) ✓` : 'Todo al día ✓')
      }
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="tarjeta">
      <div className="fila-entre">
        <h3>Mi historial</h3>
        <button type="button" onClick={handleSincronizar} disabled={sincronizando}>
          {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
        </button>
      </div>

      {mensaje && <p className="mensaje-info">{mensaje}</p>}

      {soloPendientes.length > 0 && (
        <>
          <h4>Pendientes de subir ({soloPendientes.length})</h4>
          <ul className="lista-viajes">
            {soloPendientes.map((v) => (
              <li key={v.client_uuid} className="viaje pendiente">
                <div className="fila-entre">
                  <strong>
                    {v.fecha} · {v.producto} · guía {v.numero_guia}
                  </strong>
                  <span className="chip chip-pendiente">Pendiente</span>
                </div>
                <span className="texto-suave">
                  {v.cliente_nombre} · {v.camion_patente} · {(v.kg_inicial + v.kg_final) / 2} kg ·{' '}
                  {v.km_final - v.km_inicial} km
                </span>
                {v.ultimo_error && <span className="mensaje-error">Error: {v.ultimo_error}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      <h4>Sincronizados ({sincronizados.length})</h4>
      {sincronizados.length === 0 && (
        <p className="texto-suave">Aún no hay viajes sincronizados. Presiona "Sincronizar" con señal.</p>
      )}
      <ul className="lista-viajes">
        {sincronizados.map((v) => (
          <li key={v.id} className="viaje">
            <div className="fila-entre">
              <strong>
                Orden #{v.numero_orden} · {v.fecha} · {v.producto}
              </strong>
              <span className="chip chip-ok">✓</span>
            </div>
            <span className="texto-suave">
              {v.cliente_nombre} · {v.camion_patente} · guía {v.numero_guia} ·{' '}
              {(v.kg_inicial + v.kg_final) / 2} kg · {v.km_final - v.km_inicial} km
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
