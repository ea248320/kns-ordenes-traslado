import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

interface Alerta {
  tipo: string
  detalle: string
}

const DIAS_INACTIVIDAD = 3
const UMBRAL_FLETES_DIA = 12

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[] | null>(null)

  useEffect(() => {
    async function cargar() {
      const encontradas: Alerta[] = []

      const [inactivos, atipicos, duplicadas, invalidos] = await Promise.all([
        supabase.rpc('alertas_camiones_inactivos', { dias_umbral: DIAS_INACTIVIDAD }),
        supabase.rpc('alertas_fletes_atipicos_chofer', { umbral_diario: UMBRAL_FLETES_DIA }),
        supabase.from('v_alertas_guias_duplicadas').select('*'),
        supabase.from('v_alertas_kg_km_invalidos').select('*'),
      ])

      for (const fila of inactivos.data ?? []) {
        encontradas.push({
          tipo: 'Camión inactivo',
          detalle: fila.ultima_fecha
            ? `${fila.patente}: sin fletes hace ${fila.dias_sin_actividad} días (último: ${fila.ultima_fecha})`
            : `${fila.patente}: nunca ha registrado fletes`,
        })
      }
      for (const fila of atipicos.data ?? []) {
        encontradas.push({
          tipo: 'Fletes inusuales',
          detalle: `${fila.chofer_nombre}: ${fila.cantidad_fletes} fletes el ${fila.fecha} (umbral ${UMBRAL_FLETES_DIA})`,
        })
      }
      for (const fila of duplicadas.data ?? []) {
        encontradas.push({
          tipo: 'Guía duplicada',
          detalle: `Guía ${fila.numero_guia} aparece en ${fila.cantidad} traslados`,
        })
      }
      for (const fila of invalidos.data ?? []) {
        encontradas.push({
          tipo: 'Kg/Km inválidos',
          detalle: `Orden #${fila.numero_orden} (${fila.fecha}): kg neto ${fila.kg_neto}, km ${fila.km_recorrido}`,
        })
      }

      setAlertas(encontradas)
    }
    void cargar()
  }, [])

  if (alertas === null) return null
  if (alertas.length === 0)
    return (
      <div className="tarjeta alertas-ok">
        <strong>Sin alertas</strong>
        <span className="texto-suave"> · camiones activos, sin guías duplicadas ni valores inválidos</span>
      </div>
    )

  return (
    <div className="tarjeta alertas">
      <h4>⚠ Alertas ({alertas.length})</h4>
      <ul>
        {alertas.map((a, i) => (
          <li key={i}>
            <span className="chip chip-alerta">{a.tipo}</span> {a.detalle}
          </li>
        ))}
      </ul>
    </div>
  )
}
