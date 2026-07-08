// Sincronización offline → online del chofer.
//
// Subida (flushOutbox): cada traslado pendiente se inserta en Supabase con su
// client_uuid generado en el dispositivo. Si el servidor responde 23505
// (unique violation sobre client_uuid), el registro YA había llegado en un
// intento anterior que se cortó a mitad de camino: se trata como éxito y se
// saca de la cola. Eso hace la sincronización idempotente.
//
// Bajada (pullHistorial / pullClientes): refresca los caches locales para que
// historial y autocompletado funcionen sin señal.
import { choferClient } from './choferClient'
import { db, type OutboxTraslado } from './db'
import { sesionChoferExpirada, type SesionChofer } from '../auth/useAuth'

export interface ResultadoSync {
  subidos: number
  pendientes: number
  sesionExpirada: boolean
  errores: string[]
}

export async function flushOutbox(sesion: SesionChofer): Promise<ResultadoSync> {
  const resultado: ResultadoSync = { subidos: 0, pendientes: 0, sesionExpirada: false, errores: [] }

  if (sesionChoferExpirada(sesion)) {
    resultado.sesionExpirada = true
    resultado.pendientes = await db.outbox.count()
    return resultado
  }

  const client = choferClient(sesion.access_token)
  const pendientes = await db.outbox.orderBy('creado_en').toArray()

  for (const pendiente of pendientes) {
    const { error } = await client.from('traslados').insert({
      client_uuid: pendiente.client_uuid,
      fecha: pendiente.fecha,
      chofer_id: pendiente.chofer_id,
      camion_id: pendiente.camion_id,
      cliente_id: pendiente.cliente_id,
      direccion_inicial: pendiente.direccion_inicial,
      direccion_final: pendiente.direccion_final,
      numero_guia: pendiente.numero_guia,
      producto: pendiente.producto,
      kg_inicial: pendiente.kg_inicial,
      kg_final: pendiente.kg_final,
      km_inicial: pendiente.km_inicial,
      km_final: pendiente.km_final,
    })

    if (!error || error.code === '23505') {
      await db.outbox.delete(pendiente.client_uuid)
      resultado.subidos++
    } else if (error.code === 'PGRST301' || error.message.includes('JWT')) {
      resultado.sesionExpirada = true
      break
    } else {
      await db.outbox.update(pendiente.client_uuid, { ultimo_error: error.message })
      resultado.errores.push(`Guía ${pendiente.numero_guia}: ${error.message}`)
    }
  }

  resultado.pendientes = await db.outbox.count()
  return resultado
}

export async function pullHistorial(sesion: SesionChofer): Promise<void> {
  if (sesionChoferExpirada(sesion)) return
  const client = choferClient(sesion.access_token)

  const { data, error } = await client
    .from('traslados')
    .select('*, clientes(nombre), camiones(patente)')
    .order('creado_en', { ascending: false })
    .limit(300)

  if (error || !data) return

  await db.transaction('rw', db.historial, async () => {
    await db.historial.clear()
    await db.historial.bulkPut(
      data.map((filaTraslado) => {
        const fila = filaTraslado as typeof filaTraslado & {
          clientes: { nombre: string } | null
          camiones: { patente: string } | null
        }
        return {
          id: fila.id,
          client_uuid: fila.client_uuid,
          numero_orden: fila.numero_orden,
          fecha: fila.fecha,
          camion_patente: fila.camiones?.patente ?? '',
          cliente_nombre: fila.clientes?.nombre ?? '',
          direccion_inicial: fila.direccion_inicial,
          direccion_final: fila.direccion_final,
          numero_guia: fila.numero_guia,
          producto: fila.producto,
          kg_inicial: Number(fila.kg_inicial),
          kg_final: Number(fila.kg_final),
          km_inicial: Number(fila.km_inicial),
          km_final: Number(fila.km_final),
          creado_en: fila.creado_en,
        }
      }),
    )
  })
}

export async function pullClientes(sesion: SesionChofer): Promise<void> {
  if (sesionChoferExpirada(sesion)) return
  const client = choferClient(sesion.access_token)

  const { data, error } = await client
    .from('clientes')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  if (error || !data || data.length === 0) return

  await db.transaction('rw', db.clientes, async () => {
    await db.clientes.clear()
    await db.clientes.bulkPut(data)
  })
}

export async function encolarTraslado(traslado: OutboxTraslado): Promise<void> {
  await db.outbox.add(traslado)
}

export async function syncCompleto(sesion: SesionChofer): Promise<ResultadoSync> {
  const resultado = await flushOutbox(sesion)
  if (!resultado.sesionExpirada) {
    await Promise.all([pullHistorial(sesion), pullClientes(sesion)])
  }
  return resultado
}
