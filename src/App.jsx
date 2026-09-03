import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchCampanas, fetchIncentivos } from './api'
import { temaDe, buscarProyecto } from './campaign'
import { Target, Trophy, Calculator, ListFilter, Users } from 'lucide-react'
import { generarReporte } from './export'

import CampaignPicker from './components/CampaignPicker'
import ProjectTabs from './components/ProjectTabs'
import { CargandoPanel, ErrorPanel, RespaldoBanner } from './components/StateBanner'

import RulesSection from './sections/RulesSection'
import PodiumSection from './sections/PodiumSection'
import CalculatorSection from './sections/CalculatorSection'
import DetailSection from './sections/DetailSection'
import SupervisorsSection from './sections/SupervisorsSection'

const SECCIONES_BASE = [
  { id: 'rules', label: 'Reglas Oficiales', Icon: Target },
  { id: 'podium', label: 'Podio Afiliadores', Icon: Trophy },
  { id: 'calc', label: 'Calculadora', Icon: Calculator },
  { id: 'detail', label: 'Detalle y Filtros', Icon: ListFilter }
]

/** Campaña a mostrar al entrar: la vigente más reciente; si no hay ninguna
 *  vigente, la última terminada (la API las devuelve ordenadas desc). */
function campanaPorDefecto(lista) {
  return (lista.find(c => c.estado === 'activa') || lista[0])?.id || null
}

export default function App() {
  const [campanas, setCampanas] = useState([])
  const [campanaId, setCampanaId] = useState(null)
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [reintento, setReintento] = useState(0)

  const [activeProject, setActiveProject] = useState(null)
  const [activeSection, setActiveSection] = useState('podium')
  const [selCity, setSelCity] = useState('ALL')
  const [selSup, setSelSup] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sim, setSim] = useState({})
  const [exportando, setExportando] = useState(false)

  // 1) Lista de campañas elegibles.
  useEffect(() => {
    let vigente = true
    setError(null)
    fetchCampanas()
      .then(res => {
        if (!vigente) return
        setCampanas(res.campanas)
        setCampanaId(prev => prev || campanaPorDefecto(res.campanas))
        if (res.campanas.length === 0) {
          setCargando(false)
          setError('No hay campañas configuradas.')
        }
      })
      .catch(err => {
        if (!vigente) return
        setCargando(false)
        setError(err.message)
      })
    return () => { vigente = false }
  }, [reintento])

  // 2) Datos de la campaña seleccionada.
  useEffect(() => {
    if (!campanaId) return
    let vigente = true
    setCargando(true)
    setError(null)
    fetchIncentivos(campanaId)
      .then(res => {
        if (!vigente) return
        setData(res)
        setCargando(false)
      })
      .catch(err => {
        if (!vigente) return
        setData(null)
        setError(err.message)
        setCargando(false)
      })
    return () => { vigente = false }
  }, [campanaId, reintento])

  const campana = data?.campana || null
  const proyectos = useMemo(() => campana?.proyectos || [], [campana])

  // Al cambiar de campaña el proyecto activo puede no existir en la nueva.
  useEffect(() => {
    if (proyectos.length === 0) return
    if (!proyectos.some(p => p.key === activeProject)) {
      setActiveProject(proyectos[0].key)
    }
  }, [proyectos, activeProject])

  // La calculadora arranca con valores cercanos a cada meta de la campaña.
  useEffect(() => {
    if (proyectos.length === 0) return
    setSim(Object.fromEntries(proyectos.map(p => [p.key, Math.max(p.meta - 5, 0)])))
  }, [proyectos])

  const proyecto = buscarProyecto(campana, activeProject) || proyectos[0] || null
  const tema = temaDe(proyecto)

  const secciones = useMemo(() => (
    campana?.supervisor
      ? [...SECCIONES_BASE, { id: 'supervisores', label: 'Supervisores', Icon: Users }]
      : SECCIONES_BASE
  ), [campana])

  // Una sección sólo existente en algunas campañas no puede quedar activa al
  // cambiar a una que no la tiene.
  useEffect(() => {
    if (!secciones.some(s => s.id === activeSection)) setActiveSection('podium')
  }, [secciones, activeSection])

  // Filas con la cuenta del proyecto activo resuelta. El estado (metas
  // cumplidas, premio) lo calcula el backend: aquí no se duplican reglas.
  const filasProyecto = useMemo(() => {
    if (!proyecto) return []
    return (data?.afiliadores || []).map(a => ({
      ...a,
      cuentasProj: a.cuentas?.[proyecto.key] ?? 0
    }))
  }, [data, proyecto])

  const ciudades = useMemo(() => (
    ['ALL', ...Array.from(new Set(filasProyecto.map(d => d.ciudad))).filter(Boolean).sort()]
  ), [filasProyecto])

  const supervisoresFiltro = useMemo(() => {
    const base = selCity === 'ALL' ? filasProyecto : filasProyecto.filter(d => d.ciudad === selCity)
    return ['ALL', ...Array.from(new Set(base.map(d => d.supervisor))).filter(Boolean).sort()]
  }, [filasProyecto, selCity])

  useEffect(() => {
    if (selSup !== 'ALL' && !supervisoresFiltro.includes(selSup)) setSelSup('ALL')
  }, [supervisoresFiltro, selSup])

  useEffect(() => {
    if (selCity !== 'ALL' && !ciudades.includes(selCity)) setSelCity('ALL')
  }, [ciudades, selCity])

  const filas = useMemo(() => (
    filasProyecto
      .filter(item => (
        (selCity === 'ALL' || item.ciudad === selCity) &&
        (selSup === 'ALL' || item.supervisor === selSup) &&
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      ))
      .sort((a, b) => b.cuentasProj - a.cuentasProj)
  ), [filasProyecto, selCity, selSup, searchTerm])

  const kpis = useMemo(() => {
    let totalCuentas = 0, habilitados = 0, dobles = 0
    filas.forEach(item => {
      totalCuentas += item.cuentasProj
      if (proyecto && item.metas_cumplidas.includes(proyecto.key)) habilitados++
      if (item.es_doble) dobles++
    })
    return { totalCuentas, habilitados, dobles, staffCount: filas.length }
  }, [filas, proyecto])

  const cambiarCampana = useCallback(id => {
    setCampanaId(id)
    setSelCity('ALL')
    setSelSup('ALL')
    setSearchTerm('')
  }, [])

  const cambiarProyecto = useCallback(key => {
    setActiveProject(key)
    setSelCity('ALL')
    setSelSup('ALL')
  }, [])

  const cambiarSim = useCallback((key, valor) => {
    setSim(prev => ({ ...prev, [key]: valor }))
  }, [])

  // Reporte para contabilidad: siempre la campana completa, sin los filtros de
  // pantalla, para que el archivo no dependa de como quedo la vista.
  const descargarReporte = useCallback(async () => {
    if (!data?.campana) return
    setExportando(true)
    try {
      await generarReporte({
        campana: data.campana,
        afiliadores: data.afiliadores,
        supervisores: data.supervisores
      })
    } catch (err) {
      setError(`No se pudo generar el reporte: ${err.message}`)
    } finally {
      setExportando(false)
    }
  }, [data])

  const campanaSel = campanas.find(c => c.id === campanaId)
  const anio = campana?.hasta?.slice(0, 4) || campanaSel?.hasta?.slice(0, 4) || ''

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12 text-slate-900 antialiased font-sans text-sm">

      <header className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-sm border-b-4 border-blue-500 space-y-3">
        <div className="flex justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-white truncate">
              {campana?.nombre || campanaSel?.nombre || 'Incentivos BEX'}
            </h1>
            <p className="text-[10px] text-white/60 font-medium">
              {campana?.periodo_texto || campanaSel?.periodo_texto || ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Descarga el reporte de contabilidad al hacer clic. A pedido del
                usuario no se anuncia: mismo aspecto que el sello de marca que
                habia antes, sin icono ni tooltip. La unica senal es que se
                atenua mientras arma el archivo, y eso ademas evita la doble
                descarga por doble clic. */}
            <button
              onClick={descargarReporte}
              disabled={!campana || exportando}
              className={`bg-white text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg transition-opacity ${
                exportando ? 'opacity-60' : ''
              }`}
            >
              BEX
            </button>
            {campanaSel?.estado === 'pasada' && (
              <span className="text-[9px] font-semibold uppercase tracking-wide bg-white/10 border border-white/20 px-2 py-0.5 rounded-md">
                Finalizada
              </span>
            )}
            {campanaSel?.estado === 'futura' && (
              <span className="text-[9px] font-semibold uppercase tracking-wide bg-white/10 border border-white/20 px-2 py-0.5 rounded-md">
                Próxima
              </span>
            )}
          </div>
        </div>
        {campanas.length > 0 && (
          <CampaignPicker campanas={campanas} campanaId={campanaId} onChange={cambiarCampana} />
        )}
      </header>

      {data?.es_respaldo && <RespaldoBanner />}

      {error && <ErrorPanel mensaje={error} onReintentar={() => setReintento(n => n + 1)} />}

      {!error && (cargando || !campana || !proyecto) && <CargandoPanel />}

      {!error && !cargando && campana && proyecto && (
        <>
          <ProjectTabs proyectos={proyectos} activo={proyecto.key} onChange={cambiarProyecto} />

          <div className="grid grid-cols-2 gap-2">
            {secciones.map((tab, i) => {
              const Icon = tab.Icon
              const ultimoImpar = secciones.length % 2 === 1 && i === secciones.length - 1
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  aria-pressed={activeSection === tab.id}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[11px] font-semibold cursor-pointer text-center shadow-xs transition-[background-color,color,border-color] active:scale-[0.96] ${
                    ultimoImpar ? 'col-span-2' : ''
                  } ${
                    activeSection === tab.id
                      ? 'bg-slate-800 text-white border border-slate-800'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={13} strokeWidth={2} className="shrink-0" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeSection === 'rules' && <RulesSection campana={campana} />}

          {activeSection === 'podium' && (
            <PodiumSection filas={filas} proyecto={proyecto} tema={tema} />
          )}

          {activeSection === 'calc' && (
            <CalculatorSection
              campana={campana}
              proyecto={proyecto}
              tema={tema}
              sim={sim}
              onSimChange={cambiarSim}
            />
          )}

          {activeSection === 'detail' && (
            <DetailSection
              campana={campana}
              proyecto={proyecto}
              tema={tema}
              filas={filas}
              kpis={kpis}
              ciudades={ciudades}
              supervisores={supervisoresFiltro}
              selCity={selCity}
              selSup={selSup}
              searchTerm={searchTerm}
              onCity={setSelCity}
              onSup={setSelSup}
              onSearch={setSearchTerm}
            />
          )}

          {activeSection === 'supervisores' && campana.supervisor && (
            <SupervisorsSection campana={campana} supervisores={data.supervisores || []} />
          )}
        </>
      )}

      <footer className="text-center text-[9px] font-medium text-slate-400 pt-2 tracking-wide space-y-0.5">
        <div>BEX &copy; {anio} - {campana?.nombre || 'Incentivos'} ({campana?.periodo_texto || ''})</div>
        {data?.fecha_actualizacion && <div>Actualizado: {data.fecha_actualizacion}</div>}
      </footer>

    </div>
  )
}
