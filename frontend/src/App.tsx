import { lazy, Suspense, useState } from 'react'
import { useAuth } from './auth/useAuth'
import LoginChofer from './features/chofer/LoginChofer'
import ChoferHome from './features/chofer/ChoferHome'
import LoginJefe from './features/jefe/LoginJefe'

// El panel del jefe (gráficos, exportación) es la parte pesada de la app y
// no se necesita offline; se carga aparte para que el bundle que precachea
// el Service Worker del chofer quede liviano.
const JefeHome = lazy(() => import('./features/jefe/JefeHome'))

export default function App() {
  const { sesionChofer, loginChofer, logoutChofer, sesionJefe, cargandoJefe, logoutJefe } = useAuth()
  const [pantallaLogin, setPantallaLogin] = useState<'selector' | 'chofer' | 'jefe'>('selector')

  if (sesionChofer) return <ChoferHome sesion={sesionChofer} onLogout={logoutChofer} />
  if (cargandoJefe) return null
  if (sesionJefe)
    return (
      <Suspense fallback={<p className="texto-suave" style={{ padding: '2rem' }}>Cargando panel…</p>}>
        <JefeHome onLogout={logoutJefe} />
      </Suspense>
    )

  if (pantallaLogin === 'chofer')
    return <LoginChofer onLogin={loginChofer} onVolver={() => setPantallaLogin('selector')} />
  if (pantallaLogin === 'jefe') return <LoginJefe onVolver={() => setPantallaLogin('selector')} />

  return (
    <div className="pantalla-centrada">
      <div className="tarjeta formulario-login">
        <img src="/logo.png" alt="KNS Transportes" className="logo-login" />
        <p className="texto-suave">Órdenes de traslado digitales</p>
        <button type="button" onClick={() => setPantallaLogin('chofer')}>
          Soy Chofer
        </button>
        <button type="button" className="boton-secundario" onClick={() => setPantallaLogin('jefe')}>
          Soy Jefe de Transportes
        </button>
      </div>
    </div>
  )
}
