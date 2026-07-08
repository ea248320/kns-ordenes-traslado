import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export interface SesionChofer {
  access_token: string
  expires_at: number // epoch segundos
  chofer: { id: string; nombre: string }
  camion: { id: string; patente: string }
}

const STORAGE_KEY = 'kns_sesion_chofer'

function cargarSesionChofer(): SesionChofer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SesionChofer) : null
  } catch {
    return null
  }
}

export function sesionChoferExpirada(sesion: SesionChofer): boolean {
  return sesion.expires_at * 1000 < Date.now()
}

export function useAuth() {
  // La sesión del chofer se conserva aunque expire: si está sin señal debe
  // poder seguir registrando viajes en la cola local. La expiración solo
  // bloquea la sincronización, no la captura.
  const [sesionChofer, setSesionChofer] = useState<SesionChofer | null>(cargarSesionChofer)
  const [sesionJefe, setSesionJefe] = useState<Session | null>(null)
  const [cargandoJefe, setCargandoJefe] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesionJefe(data.session)
      setCargandoJefe(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, session) => {
      setSesionJefe(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loginChofer = useCallback((sesion: SesionChofer) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion))
    setSesionChofer(sesion)
  }, [])

  const logoutChofer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSesionChofer(null)
  }, [])

  const logoutJefe = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { sesionChofer, loginChofer, logoutChofer, sesionJefe, cargandoJefe, logoutJefe }
}
