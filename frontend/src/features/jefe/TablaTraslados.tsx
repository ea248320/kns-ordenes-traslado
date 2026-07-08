import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { ProductoTipo, TrasladoDetalle } from '../../types/database'
import type { Catalogos } from './datos'
import { exportarTrasladosExcel, exportarTrasladosPdf } from './exportar'

interface Props {
  filas: TrasladoDetalle[]
  catalogos: Catalogos
  onRecargar: () => void
}

interface CambioAuditoria {
  id: string
  editado_por: string
  editado_en: string
  cambios: Record<string, { antes: string | null; despues: string | null }>
}

const CAMPOS_EDITABLES = [
  'fecha',
  'chofer_id',
  'camion_id',
  'cliente_id',
  'direccion_inicial',
  'direccion_final',
  'numero_guia',
  'producto',
  'kg_inicial',
  'kg_final',
  'km_inicial',
  'km_final',
] as const

export default function TablaTraslados({ filas, catalogos, onRecargar }: Props) {
  const [editando, setEditando] = useState<TrasladoDetalle | null>(null)
  const [auditoriaDe, setAuditoriaDe] = useState<TrasladoDetalle | null>(null)

  return (
    <div className="tarjeta">
      <div className="fila-entre">
        <h3>Traslados ({filas.length})</h3>
        <div className="fila-botones">
          <button type="button" className="boton-secundario" onClick={() => exportarTrasladosExcel(filas)}>
            Excel
          </button>
          <button type="button" className="boton-secundario" onClick={() => exportarTrasladosPdf(filas)}>
            PDF
          </button>
        </div>
      </div>

      <div className="tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>Fecha</th>
              <th>Chofer</th>
              <th>Camión</th>
              <th>Cliente</th>
              <th>Producto</th>
              <th>Guía</th>
              <th>Kg</th>
              <th>Km</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((t) => (
              <tr key={t.id}>
                <td>{t.numero_orden}</td>
                <td>{t.fecha}</td>
                <td>{t.chofer_nombre}</td>
                <td>{t.camion_patente}</td>
                <td>{t.cliente_nombre}</td>
                <td>{t.producto}</td>
                <td>{t.numero_guia}</td>
                <td className={t.kg_neto <= 0 ? 'valor-alerta' : ''}>{t.kg_neto.toLocaleString('es-CL')}</td>
                <td className={t.km_recorrido <= 0 ? 'valor-alerta' : ''}>
                  {t.km_recorrido.toLocaleString('es-CL')}
                </td>
                <td className="fila-botones">
                  <button type="button" className="boton-secundario" onClick={() => setEditando(t)}>
                    Editar
                  </button>
                  <button type="button" className="boton-secundario" onClick={() => setAuditoriaDe(t)}>
                    Historial
                  </button>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={10} className="texto-suave">
                  Sin traslados en el período/filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editando && (
        <ModalEditar
          traslado={editando}
          catalogos={catalogos}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            onRecargar()
          }}
        />
      )}
      {auditoriaDe && <ModalAuditoria traslado={auditoriaDe} onCerrar={() => setAuditoriaDe(null)} />}
    </div>
  )
}

function ModalEditar({
  traslado,
  catalogos,
  onCerrar,
  onGuardado,
}: {
  traslado: TrasladoDetalle
  catalogos: Catalogos
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [valores, setValores] = useState({
    fecha: traslado.fecha,
    chofer_id: traslado.chofer_id,
    camion_id: traslado.camion_id,
    cliente_id: traslado.cliente_id,
    direccion_inicial: traslado.direccion_inicial,
    direccion_final: traslado.direccion_final,
    numero_guia: traslado.numero_guia,
    producto: traslado.producto as ProductoTipo,
    kg_inicial: String(traslado.kg_inicial),
    kg_final: String(traslado.kg_final),
    km_inicial: String(traslado.km_inicial),
    km_final: String(traslado.km_final),
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function set<K extends keyof typeof valores>(campo: K, valor: (typeof valores)[K]) {
    setValores((v) => ({ ...v, [campo]: valor }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)
    const { error: updError } = await supabase
      .from('traslados')
      .update({
        fecha: valores.fecha,
        chofer_id: valores.chofer_id,
        camion_id: valores.camion_id,
        cliente_id: valores.cliente_id,
        direccion_inicial: valores.direccion_inicial,
        direccion_final: valores.direccion_final,
        numero_guia: valores.numero_guia,
        producto: valores.producto,
        kg_inicial: Number(valores.kg_inicial),
        kg_final: Number(valores.kg_final),
        km_inicial: Number(valores.km_inicial),
        km_final: Number(valores.km_final),
      })
      .eq('id', traslado.id)
    setGuardando(false)
    if (updError) {
      setError(updError.message)
      return
    }
    onGuardado()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="tarjeta modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Editar orden #{traslado.numero_orden}</h3>
        <div className="grilla-2">
          <label>
            Fecha
            <input type="date" value={valores.fecha} onChange={(e) => set('fecha', e.target.value)} />
          </label>
          <label>
            Producto
            <select
              value={valores.producto}
              onChange={(e) => set('producto', e.target.value as ProductoTipo)}
            >
              <option value="trigo">Trigo</option>
              <option value="avena">Avena</option>
              <option value="raps">Raps</option>
            </select>
          </label>
          <label>
            Chofer
            <select value={valores.chofer_id} onChange={(e) => set('chofer_id', e.target.value)}>
              {catalogos.choferes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Camión
            <select value={valores.camion_id} onChange={(e) => set('camion_id', e.target.value)}>
              {catalogos.camiones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.patente}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Cliente
          <select value={valores.cliente_id} onChange={(e) => set('cliente_id', e.target.value)}>
            {catalogos.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dirección inicial
          <input
            value={valores.direccion_inicial}
            onChange={(e) => set('direccion_inicial', e.target.value)}
          />
        </label>
        <label>
          Dirección final
          <input value={valores.direccion_final} onChange={(e) => set('direccion_final', e.target.value)} />
        </label>
        <div className="grilla-2">
          <label>
            N° guía
            <input value={valores.numero_guia} onChange={(e) => set('numero_guia', e.target.value)} />
          </label>
          <span />
          <label>
            Kg inicial
            <input
              type="number"
              step="any"
              value={valores.kg_inicial}
              onChange={(e) => set('kg_inicial', e.target.value)}
            />
          </label>
          <label>
            Kg final
            <input
              type="number"
              step="any"
              value={valores.kg_final}
              onChange={(e) => set('kg_final', e.target.value)}
            />
          </label>
          <label>
            Km inicial
            <input
              type="number"
              step="any"
              value={valores.km_inicial}
              onChange={(e) => set('km_inicial', e.target.value)}
            />
          </label>
          <label>
            Km final
            <input
              type="number"
              step="any"
              value={valores.km_final}
              onChange={(e) => set('km_final', e.target.value)}
            />
          </label>
        </div>
        {error && <p className="mensaje-error">{error}</p>}
        <div className="fila-botones">
          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" className="boton-secundario" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

const NOMBRES_CAMPOS: Record<string, string> = {
  fecha: 'Fecha',
  chofer_id: 'Chofer',
  camion_id: 'Camión',
  cliente_id: 'Cliente',
  direccion_inicial: 'Dirección inicial',
  direccion_final: 'Dirección final',
  numero_guia: 'N° guía',
  producto: 'Producto',
  kg_inicial: 'Kg inicial',
  kg_final: 'Kg final',
  km_inicial: 'Km inicial',
  km_final: 'Km final',
}

function ModalAuditoria({ traslado, onCerrar }: { traslado: TrasladoDetalle; onCerrar: () => void }) {
  const [cambios, setCambios] = useState<CambioAuditoria[] | null>(null)

  useEffect(() => {
    supabase
      .from('traslados_auditoria')
      .select('id, editado_por, editado_en, cambios')
      .eq('traslado_id', traslado.id)
      .order('editado_en', { ascending: false })
      .then(({ data }) => setCambios((data as CambioAuditoria[]) ?? []))
  }, [traslado.id])

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal" onClick={(e) => e.stopPropagation()}>
        <h3>Historial de ediciones · orden #{traslado.numero_orden}</h3>
        {cambios === null && <p className="texto-suave">Cargando…</p>}
        {cambios?.length === 0 && <p className="texto-suave">Esta orden nunca ha sido editada.</p>}
        {cambios?.map((c) => (
          <div key={c.id} className="bloque-auditoria">
            <strong>{new Date(c.editado_en).toLocaleString('es-CL')}</strong>
            <ul>
              {Object.entries(c.cambios).map(([campo, delta]) => (
                <li key={campo}>
                  {NOMBRES_CAMPOS[campo] ?? campo}: <s>{delta.antes ?? '—'}</s> → {delta.despues ?? '—'}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button type="button" className="boton-secundario" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

export { CAMPOS_EDITABLES }
