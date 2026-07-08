import { useEffect, useState } from 'react'
import FormularioTraslado from './FormularioTraslado'
import HistorialChofer from './HistorialChofer'
import { syncCompleto } from '../../lib/sync'
import type { SesionChofer } from '../../auth/useAuth'

interface Props {
  sesion: SesionChofer
  onLogout: () => void
}

export default function ChoferHome({ sesion, onLogout }: Props) {
  const [vista, setVista] = useState<'formulario' | 'historial'>('formulario')
  const [online, setOnline] = useState(navigator.onLine)

  // Sincroniza al entrar y cada vez que vuelve la señal.
  useEffect(() => {
    if (navigator.onLine) void syncCompleto(sesion)

    const onOnline = () => {
      setOnline(true)
      void syncCompleto(sesion)
    }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [sesion])

  return (
    <div className="contenedor">
      <header className="barra-superior">
        <div>
          <img src="/logo.png" alt="KNS Transportes" className="logo-barra" />
          <span className={online ? 'chip chip-ok' : 'chip chip-pendiente'}>
            {online ? 'En línea' : 'Sin señal'}
          </span>
        </div>
        <button type="button" className="boton-secundario" onClick={onLogout}>
          Salir
        </button>
      </header>

      <nav className="pestanas">
        <button
          type="button"
          className={vista === 'formulario' ? 'activa' : ''}
          onClick={() => setVista('formulario')}
        >
          Nuevo traslado
        </button>
        <button
          type="button"
          className={vista === 'historial' ? 'activa' : ''}
          onClick={() => setVista('historial')}
        >
          Mi historial
        </button>
      </nav>

      {vista === 'formulario' ? (
        <FormularioTraslado sesion={sesion} />
      ) : (
        <HistorialChofer sesion={sesion} />
      )}
    </div>
  )
}
