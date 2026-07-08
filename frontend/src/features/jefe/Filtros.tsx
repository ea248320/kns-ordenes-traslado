import type { Catalogos, FiltrosTraslados } from './datos'
import { rangoAtajo } from './datos'
import type { ProductoTipo } from '../../types/database'

interface Props {
  filtros: FiltrosTraslados
  onChange: (filtros: FiltrosTraslados) => void
  catalogos: Catalogos
}

const ATAJOS = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: 'semana', etiqueta: 'Semana' },
  { clave: 'mes', etiqueta: 'Mes' },
  { clave: 'trimestre', etiqueta: 'Trimestre' },
  { clave: 'ano', etiqueta: 'Año' },
] as const

export default function Filtros({ filtros, onChange, catalogos }: Props) {
  return (
    <div className="tarjeta filtros">
      <div className="filtros-atajos">
        {ATAJOS.map((a) => (
          <button
            key={a.clave}
            type="button"
            className="boton-secundario"
            onClick={() => onChange({ ...filtros, ...rangoAtajo(a.clave) })}
          >
            {a.etiqueta}
          </button>
        ))}
      </div>
      <div className="filtros-campos">
        <label>
          Desde
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => onChange({ ...filtros, desde: e.target.value })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => onChange({ ...filtros, hasta: e.target.value })}
          />
        </label>
        <label>
          Camión
          <select
            value={filtros.camionId}
            onChange={(e) => onChange({ ...filtros, camionId: e.target.value })}
          >
            <option value="">Todos</option>
            {catalogos.camiones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.patente}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chofer
          <select
            value={filtros.choferId}
            onChange={(e) => onChange({ ...filtros, choferId: e.target.value })}
          >
            <option value="">Todos</option>
            {catalogos.choferes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Producto
          <select
            value={filtros.producto}
            onChange={(e) => onChange({ ...filtros, producto: e.target.value as ProductoTipo | '' })}
          >
            <option value="">Todos</option>
            <option value="trigo">Trigo</option>
            <option value="avena">Avena</option>
            <option value="raps">Raps</option>
          </select>
        </label>
        <label>
          Cliente
          <select
            value={filtros.clienteId}
            onChange={(e) => onChange({ ...filtros, clienteId: e.target.value })}
          >
            <option value="">Todos</option>
            {catalogos.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
