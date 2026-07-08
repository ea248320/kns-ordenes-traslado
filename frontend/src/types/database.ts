// Tipos manuales que reflejan supabase/migrations/*.sql. Cuando el esquema
// crezca, conviene regenerarlos con `supabase gen types typescript` en vez
// de mantenerlos a mano.
//
// Nota: se usan `type` y no `interface` a propósito -- supabase-js exige que
// las filas satisfagan Record<string, unknown>, y las interfaces no tienen
// index signature implícita (todo degradaría a `never`).

export type ProductoTipo = 'trigo' | 'avena' | 'raps'

export type Chofer = {
  id: string
  rut: string
  nombre: string
  activo: boolean
  creado_en: string
}

export type Camion = {
  id: string
  patente: string
  activo: boolean
  creado_en: string
}

export type Cliente = {
  id: string
  nombre: string
  nombre_normalizado: string
  activo: boolean
  creado_en: string
}

export type Traslado = {
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

export type TrasladoInsert = Omit<
  Traslado,
  'id' | 'numero_orden' | 'kg_neto' | 'km_recorrido' | 'creado_por_tipo' | 'creado_en' | 'actualizado_en'
> &
  Partial<Pick<Traslado, 'id' | 'creado_por_tipo'>>

export type TrasladoDetalle = Omit<Traslado, 'creado_por_tipo'> & {
  chofer_nombre: string
  camion_patente: string
  cliente_nombre: string
  creado_por_tipo: string
}

export type TrasladoAuditoria = {
  id: string
  traslado_id: string
  editado_por: string
  editado_en: string
  cambios: Record<string, { antes: string | null; despues: string | null }>
}

export type Perfil = {
  id: string
  nombre: string | null
  rol: 'jefe' | 'admin'
  creado_en: string
}

type TablaGenerica<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      choferes: TablaGenerica<Chofer>
      camiones: TablaGenerica<Camion>
      clientes: TablaGenerica<Cliente>
      perfiles: TablaGenerica<Perfil>
      traslados: TablaGenerica<Traslado, TrasladoInsert>
      traslados_auditoria: TablaGenerica<TrasladoAuditoria>
    }
    Views: {
      v_traslados_detalle: { Row: TrasladoDetalle; Relationships: [] }
      v_alertas_guias_duplicadas: {
        Row: { numero_guia: string; cantidad: number; traslado_ids: string[] }
        Relationships: []
      }
      v_alertas_kg_km_invalidos: {
        Row: {
          id: string
          numero_orden: number | null
          fecha: string
          chofer_id: string
          camion_id: string
          kg_neto: number
          km_recorrido: number
        }
        Relationships: []
      }
    }
    Functions: {
      alertas_camiones_inactivos: {
        Args: { dias_umbral?: number }
        Returns: {
          camion_id: string
          patente: string
          ultima_fecha: string | null
          dias_sin_actividad: number
        }[]
      }
      alertas_fletes_atipicos_chofer: {
        Args: { umbral_diario?: number }
        Returns: {
          chofer_id: string
          chofer_nombre: string
          fecha: string
          cantidad_fletes: number
        }[]
      }
    }
    Enums: {
      producto_tipo: ProductoTipo
    }
    CompositeTypes: Record<string, never>
  }
}
