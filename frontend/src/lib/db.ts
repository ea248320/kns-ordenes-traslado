// Base de datos local (IndexedDB vía Dexie) para el modo offline del chofer:
// - outbox: traslados registrados en el dispositivo, pendientes de subir.
// - historial: cache de los traslados ya sincronizados (lo que devuelve el
//   servidor), para que el historial abra sin señal.
// - clientes: cache del catálogo, para el autocompletado del formulario.
import Dexie, { type EntityTable } from 'dexie'
import type { ProductoTipo } from '../types/database'

export interface OutboxTraslado {
  client_uuid: string
  fecha: string
  chofer_id: string
  camion_id: string
  camion_patente: string
  cliente_id: string
  cliente_nombre: string
  direccion_inicial: string
  direccion_final: string
  numero_guia: string
  producto: ProductoTipo
  kg_inicial: number
  kg_final: number
  km_inicial: number
  km_final: number
  creado_en: string
  ultimo_error?: string
}

export interface HistorialTraslado {
  id: string
  client_uuid: string
  numero_orden: number | null
  fecha: string
  camion_patente: string
  cliente_nombre: string
  direccion_inicial: string
  direccion_final: string
  numero_guia: string
  producto: ProductoTipo
  kg_inicial: number
  kg_final: number
  km_inicial: number
  km_final: number
  creado_en: string
}

export interface ClienteCache {
  id: string
  nombre: string
}

export const db = new Dexie('kns-traslados') as Dexie & {
  outbox: EntityTable<OutboxTraslado, 'client_uuid'>
  historial: EntityTable<HistorialTraslado, 'id'>
  clientes: EntityTable<ClienteCache, 'id'>
}

db.version(1).stores({
  outbox: 'client_uuid, creado_en',
  historial: 'id, fecha, creado_en',
  clientes: 'id, nombre',
})
