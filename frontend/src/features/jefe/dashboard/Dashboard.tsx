import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrasladoDetalle } from '../../../types/database'
import Alertas from './Alertas'

interface Props {
  filas: TrasladoDetalle[] // período actual, ya filtrado
  filasAnterior: TrasladoDetalle[] // período anterior de igual duración, mismos filtros
  desde: string
  hasta: string
}

const COLORES_PRODUCTO: Record<string, string> = {
  trigo: '#d97706',
  avena: '#65a30d',
  raps: '#7c3aed',
}
const COLOR_BARRA = '#0ea5e9'

function porcentajeDelta(actual: number, anterior: number): string | null {
  if (anterior === 0) return actual > 0 ? 'nuevo' : null
  const delta = ((actual - anterior) / anterior) * 100
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%`
}

function resumen(filas: TrasladoDetalle[]) {
  return {
    camiones: new Set(filas.map((t) => t.camion_id)).size,
    choferes: new Set(filas.map((t) => t.chofer_id)).size,
    fletes: filas.length,
    kg: filas.reduce((s, t) => s + t.kg_neto, 0),
    km: filas.reduce((s, t) => s + t.km_recorrido, 0),
  }
}

function agrupar<K extends string>(
  filas: TrasladoDetalle[],
  clave: (t: TrasladoDetalle) => K,
): { nombre: K; fletes: number; kg: number; km: number }[] {
  const mapa = new Map<K, { nombre: K; fletes: number; kg: number; km: number }>()
  for (const t of filas) {
    const k = clave(t)
    const acumulado = mapa.get(k) ?? { nombre: k, fletes: 0, kg: 0, km: 0 }
    acumulado.fletes++
    acumulado.kg += t.kg_neto
    acumulado.km += t.km_recorrido
    mapa.set(k, acumulado)
  }
  return [...mapa.values()].sort((a, b) => b.fletes - a.fletes)
}

type Granularidad = 'dia' | 'semana' | 'mes'

function claveTemporal(fecha: string, granularidad: Granularidad): string {
  const d = new Date(fecha + 'T00:00:00')
  if (granularidad === 'dia') return fecha
  if (granularidad === 'mes') return fecha.slice(0, 7)
  // Semana: fecha del lunes correspondiente.
  const dia = d.getDay()
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  return d.toISOString().slice(0, 10)
}

const numeroCL = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 0 })

export default function Dashboard({ filas, filasAnterior, desde, hasta }: Props) {
  const [granularidad, setGranularidad] = useState<Granularidad>('dia')

  const actual = useMemo(() => resumen(filas), [filas])
  const anterior = useMemo(() => resumen(filasAnterior), [filasAnterior])

  const porProducto = useMemo(() => agrupar(filas, (t) => t.producto), [filas])
  const porCamion = useMemo(() => agrupar(filas, (t) => t.camion_patente), [filas])
  const porChofer = useMemo(() => agrupar(filas, (t) => t.chofer_nombre), [filas])
  const porCliente = useMemo(
    () => agrupar(filas, (t) => t.cliente_nombre).slice(0, 10),
    [filas],
  )

  const evolucion = useMemo(() => {
    const mapa = new Map<string, { periodo: string; fletes: number; kg: number }>()
    for (const t of filas) {
      const k = claveTemporal(t.fecha, granularidad)
      const acumulado = mapa.get(k) ?? { periodo: k, fletes: 0, kg: 0 }
      acumulado.fletes++
      acumulado.kg += t.kg_neto
      mapa.set(k, acumulado)
    }
    return [...mapa.values()].sort((a, b) => a.periodo.localeCompare(b.periodo))
  }, [filas, granularidad])

  const eficiencia = useMemo(() => {
    const diasPeriodo =
      Math.round(
        (new Date(hasta + 'T00:00:00').getTime() - new Date(desde + 'T00:00:00').getTime()) / 86400000,
      ) + 1
    const porCamionMapa = new Map<string, { dias: Set<string>; kg: number; km: number }>()
    for (const t of filas) {
      const registro = porCamionMapa.get(t.camion_patente) ?? { dias: new Set<string>(), kg: 0, km: 0 }
      registro.dias.add(t.fecha)
      registro.kg += t.kg_neto
      registro.km += t.km_recorrido
      porCamionMapa.set(t.camion_patente, registro)
    }
    return [...porCamionMapa.entries()]
      .map(([patente, r]) => ({
        patente,
        kgPorKm: r.km > 0 ? r.kg / r.km : 0,
        pctDiasActivos: Math.min(100, (r.dias.size / diasPeriodo) * 100),
      }))
      .sort((a, b) => a.pctDiasActivos - b.pctDiasActivos)
  }, [filas, desde, hasta])

  const tarjetas = [
    { titulo: 'Camiones activos', valor: actual.camiones, delta: porcentajeDelta(actual.camiones, anterior.camiones) },
    { titulo: 'Choferes activos', valor: actual.choferes, delta: porcentajeDelta(actual.choferes, anterior.choferes) },
    { titulo: 'Fletes', valor: actual.fletes, delta: porcentajeDelta(actual.fletes, anterior.fletes) },
    { titulo: 'Kg transportados', valor: actual.kg, delta: porcentajeDelta(actual.kg, anterior.kg) },
    { titulo: 'Km recorridos', valor: actual.km, delta: porcentajeDelta(actual.km, anterior.km) },
  ]

  return (
    <div className="dashboard">
      <div className="tarjetas-resumen">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="tarjeta tarjeta-kpi">
            <span className="texto-suave">{t.titulo}</span>
            <strong>{numeroCL(t.valor)}</strong>
            {t.delta && (
              <span className={t.delta.startsWith('-') ? 'delta delta-baja' : 'delta delta-sube'}>
                {t.delta} vs período anterior
              </span>
            )}
          </div>
        ))}
      </div>

      <Alertas />

      <div className="grilla-graficos">
        <div className="tarjeta">
          <h4>Fletes por producto</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={porProducto}
                dataKey="fletes"
                nameKey="nombre"
                label={(e) => {
                  const p = e as { nombre?: string; fletes?: number }
                  return `${p.nombre} (${p.fletes})`
                }}
              >
                {porProducto.map((p) => (
                  <Cell key={p.nombre} fill={COLORES_PRODUCTO[p.nombre] ?? COLOR_BARRA} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => numeroCL(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="tarjeta">
          <h4>Kg por producto</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={porProducto}
                dataKey="kg"
                nameKey="nombre"
                label={(e) => String((e as { nombre?: string }).nombre ?? '')}
              >
                {porProducto.map((p) => (
                  <Cell key={p.nombre} fill={COLORES_PRODUCTO[p.nombre] ?? COLOR_BARRA} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${numeroCL(Number(v))} kg`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="tarjeta">
          <h4>Fletes por camión</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porCamion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="fletes" fill={COLOR_BARRA} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tarjeta">
          <h4>Fletes por chofer</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porChofer}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="fletes" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tarjeta ancho-completo">
          <h4>Top clientes (por fletes)</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porCliente} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="nombre" width={180} />
              <Tooltip />
              <Bar dataKey="fletes" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="tarjeta ancho-completo">
          <div className="fila-entre">
            <h4>Evolución en el tiempo</h4>
            <div className="fila-botones">
              {(['dia', 'semana', 'mes'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={granularidad === g ? '' : 'boton-secundario'}
                  onClick={() => setGranularidad(g)}
                >
                  {g === 'dia' ? 'Día' : g === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolucion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis yAxisId="fletes" allowDecimals={false} />
              <YAxis yAxisId="kg" orientation="right" />
              <Tooltip formatter={(v, nombre) => (nombre === 'kg' ? `${numeroCL(Number(v))} kg` : v)} />
              <Legend />
              <Line yAxisId="fletes" type="monotone" dataKey="fletes" stroke={COLOR_BARRA} name="Fletes" />
              <Line yAxisId="kg" type="monotone" dataKey="kg" stroke="#ef4444" name="kg" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="tarjeta ancho-completo">
          <h4>Eficiencia por camión</h4>
          <table>
            <thead>
              <tr>
                <th>Camión</th>
                <th>Kg por km</th>
                <th>% días con actividad</th>
              </tr>
            </thead>
            <tbody>
              {eficiencia.map((e) => (
                <tr key={e.patente}>
                  <td>{e.patente}</td>
                  <td>{e.kgPorKm.toFixed(1)}</td>
                  <td className={e.pctDiasActivos < 30 ? 'valor-alerta' : ''}>
                    {e.pctDiasActivos.toFixed(0)}%
                  </td>
                </tr>
              ))}
              {eficiencia.length === 0 && (
                <tr>
                  <td colSpan={3} className="texto-suave">
                    Sin datos en el período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
