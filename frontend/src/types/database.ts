// Tipos manuales que reflejan supabase/migrations/*.sql. Cuando el esquema
// crezca, conviene regenerarlos con `supabase gen types typescript` en vez
// de mantenerlos a mano.

export type ProductoTipo = 'trigo' | 'avena' | 'raps'

export interface Chofer {
  id: string
  rut: string
  nombre: string
  activo: boolean
  creado_en: string
}

export interface Camion {
  id: string
  patente: string
  activo: boolean
  creado_en: string
}

export interface Cliente {
  id: string
  nombre: string
  nombre_normalizado: string
  activo: boolean
  creado_en: string
}

export interface Traslado {
  id: string
  client_uuid: string
  numero_orden: number | null
  fecha: string
  chofer_id: string
  camion_id: string
  cliente_id: string
  direccion_inicial: string
  direccion_final: string
  numero_guia: string
  producto: ProductoTipo
  kg_inicial: number
  kg_final: number
  kg_neto: number
  km_inicial: number
  km_final: number
  km_recorrido: number
  creado_por_tipo: 'chofer' | 'jefe'
  creado_en: string
  actualizado_en: string
}

export interface TrasladoDetalle extends Traslado {
  chofer_nombre: string
  camion_patente: string
  cliente_nombre: string
}

export interface Database {
  public: {
    Tables: {
      choferes: { Row: Chofer; Insert: Partial<Chofer>; Update: Partial<Chofer> }
      camiones: { Row: Camion; Insert: Partial<Camion>; Update: Partial<Camion> }
      clientes: { Row: Cliente; Insert: Partial<Cliente>; Update: Partial<Cliente> }
      traslados: { Row: Traslado; Insert: Partial<Traslado>; Update: Partial<Traslado> }
    }
    Views: {
      v_traslados_detalle: { Row: TrasladoDetalle }
    }
  }
}
