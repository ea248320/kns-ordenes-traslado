import { useCallback, useEffect, useState } from 'react'
import type { TrasladoDetalle } from '../../types/database'
import {
  aplicarFiltrosDimension,
  fetchCatalogos,
  fetchTrasladosDetalle,
  filtrosIniciales,
  periodoAnterior,
  type Catalogos,
  type FiltrosTraslados,
} from './datos'
import Filtros from './Filtros'
import TablaTraslados from './TablaTraslados'
import CatalogoClientes from './clientes/CatalogoClientes'
import Dashboard from './dashboard/Dashboard'

interface Props {
  onLogout: () => void
}

export default function JefeHome({ onLogout }: Props) {
  const [vista, setVista] = useState<'dashboard' | 'traslados' | 'clientes'>('dashboard')
  const [filtros, setFiltros] = useState<FiltrosTraslados>(filtrosIniciales)
  const [catalogos, setCatalogos] = useState<Catalogos>({ choferes: [], camiones: [], clientes: [] })
  const [filasActual, setFilasActual] = useState<TrasladoDetalle[]>([])
  const [filasAnterior, setFilasAnterior] = useState<TrasladoDetalle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargarCatalogos = useCallback(() => {
    fetchCatalogos()
      .then(setCatalogos)
      .catch((e: Error) => setError(e.message))
  }, [])

  const recargarTraslados = useCallback(() => {
    setCargando(true)
    setError(null)
    const prev = periodoAnterior(filtros.desde, filtros.hasta)
    Promise.all([
      fetchTrasladosDetalle(filtros.desde, filtros.hasta),
      fetchTrasladosDetalle(prev.desde, prev.hasta),
    ])
      .then(([actual, anterior]) => {
        setFilasActual(actual)
        setFilasAnterior(anterior)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false))
  }, [filtros.desde, filtros.hasta])

  useEffect(recargarCatalogos, [recargarCatalogos])
  useEffect(recargarTraslados, [recargarTraslados])

  const filasFiltradas = aplicarFiltrosDimension(filasActual, filtros)
  const filasAnteriorFiltradas = aplicarFiltrosDimension(filasAnterior, filtros)

  return (
    <div className="contenedor contenedor-ancho">
      <header className="barra-superior">
        <strong>KNS Transportes · Panel del Jefe</strong>
        <button type="button" className="boton-secundario" onClick={onLogout}>
          Cerrar sesión
        </button>
      </header>

      <nav className="pestanas">
        <button type="button" className={vista === 'dashboard' ? 'activa' : ''} onClick={() => setVista('dashboard')}>
          Dashboard
        </button>
        <button type="button" className={vista === 'traslados' ? 'activa' : ''} onClick={() => setVista('traslados')}>
          Traslados
        </button>
        <button type="button" className={vista === 'clientes' ? 'activa' : ''} onClick={() => setVista('clientes')}>
          Clientes
        </button>
      </nav>

      {vista !== 'clientes' && <Filtros filtros={filtros} onChange={setFiltros} catalogos={catalogos} />}

      {error && (
        <p className="mensaje-error">
          {error} — ¿aplicaste las migraciones y tu usuario tiene perfil de jefe?
        </p>
      )}
      {cargando && <p className="texto-suave">Cargando…</p>}

      {!cargando && vista === 'dashboard' && (
        <Dashboard
          filas={filasFiltradas}
          filasAnterior={filasAnteriorFiltradas}
          desde={filtros.desde}
          hasta={filtros.hasta}
        />
      )}
      {!cargando && vista === 'traslados' && (
        <TablaTraslados filas={filasFiltradas} catalogos={catalogos} onRecargar={recargarTraslados} />
      )}
      {vista === 'clientes' && (
        <CatalogoClientes clientes={catalogos.clientes} onRecargar={recargarCatalogos} />
      )}
    </div>
  )
}
