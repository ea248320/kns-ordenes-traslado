// Capa de datos del panel del jefe: filtros combinables (fecha, camión,
// chofer, producto, cliente) aplicables tanto a la tabla como al dashboard.
import { supabase } from '../../lib/supabaseClient'
import type { Camion, Chofer, Cliente, ProductoTipo, TrasladoDetalle } from '../../types/database'

export interface FiltrosTraslados {
  desde: string // yyyy-mm-dd
  hasta: string
  camionId: string
  choferId: string
  clienteId: string
  producto: ProductoTipo | ''
}

export function rangoAtajo(atajo: 'hoy' | 'semana' | 'mes' | 'trimestre' | 'ano'): {
  desde: string
  hasta: string
} {
  const hoy = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const inicio = new Date(hoy)

  switch (atajo) {
    case 'hoy':
      break
    case 'semana': {
      // Lunes de la semana actual.
      const dia = inicio.getDay()
      inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1))
      break
    }
    case 'mes':
      inicio.setDate(1)
      break
    case 'trimestre':
      inicio.setMonth(Math.floor(inicio.getMonth() / 3) * 3, 1)
      break
    case 'ano':
      inicio.setMonth(0, 1)
      break
  }
  return { desde: fmt(inicio), hasta: fmt(hoy) }
}

export function filtrosIniciales(): FiltrosTraslados {
  return { ...rangoAtajo('mes'), camionId: '', choferId: '', clienteId: '', producto: '' }
}

/** Período anterior de igual duración, para las comparaciones tipo "+12%". */
export function periodoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const d = new Date(desde + 'T00:00:00')
  const h = new Date(hasta + 'T00:00:00')
  const dias = Math.round((h.getTime() - d.getTime()) / 86400000) + 1
  const prevHasta = new Date(d)
  prevHasta.setDate(prevHasta.getDate() - 1)
  const prevDesde = new Date(prevHasta)
  prevDesde.setDate(prevDesde.getDate() - (dias - 1))
  const fmt = (x: Date) => x.toISOString().slice(0, 10)
  return { desde: fmt(prevDesde), hasta: fmt(prevHasta) }
}

export async function fetchTrasladosDetalle(desde: string, hasta: string): Promise<TrasladoDetalle[]> {
  const { data, error } = await supabase
    .from('v_traslados_detalle')
    .select('*')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('numero_orden', { ascending: false })
    .limit(5000)
  if (error) throw error
  return (data ?? []).map((fila) => ({
    ...fila,
    kg_inicial: Number(fila.kg_inicial),
    kg_final: Number(fila.kg_final),
    kg_neto: Number(fila.kg_neto),
    km_inicial: Number(fila.km_inicial),
    km_final: Number(fila.km_final),
    km_recorrido: Number(fila.km_recorrido),
  }))
}

/** Filtros de dimensión (los de fecha ya van en la query). */
export function aplicarFiltrosDimension(
  filas: TrasladoDetalle[],
  filtros: FiltrosTraslados,
): TrasladoDetalle[] {
  return filas.filter(
    (t) =>
      (!filtros.camionId || t.camion_id === filtros.camionId) &&
      (!filtros.choferId || t.chofer_id === filtros.choferId) &&
      (!filtros.clienteId || t.cliente_id === filtros.clienteId) &&
      (!filtros.producto || t.producto === filtros.producto),
  )
}

export interface Catalogos {
  choferes: Chofer[]
  camiones: Camion[]
  clientes: Cliente[]
}

export async function fetchCatalogos(): Promise<Catalogos> {
  const [choferes, camiones, clientes] = await Promise.all([
    supabase.from('choferes').select('*').order('nombre'),
    supabase.from('camiones').select('*').order('patente'),
    supabase.from('clientes').select('*').order('nombre'),
  ])
  if (choferes.error) throw choferes.error
  if (camiones.error) throw camiones.error
  if (clientes.error) throw clientes.error
  return {
    choferes: choferes.data ?? [],
    camiones: camiones.data ?? [],
    clientes: clientes.data ?? [],
  }
}
