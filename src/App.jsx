import React, { useState, useEffect, useMemo } from 'react'
import { fetchIncentivosData } from './api'

const STATIC_BNB_DATA = [
  { nombre: "DANIELA ANDREA VARGAS ARÉVALO", ciudad: "La Paz", supervisor: "MILENKA ADRIANA ORDOÑEZ NUÑEZ", cuentas: 62 },
  { nombre: "DIEGO ARMANDO COLQUE COLQUE", ciudad: "Cochabamba", supervisor: "PAMELA FANNY CALANI LAURA", cuentas: 45 },
  { nombre: "GABRIELA QUIÑONES YPORRE", ciudad: "Santa Cruz", supervisor: "DELIA JORDAN FACUSSE", cuentas: 75 },
  { nombre: "JHENIFER LUCERO SERRUDO LLAMPA", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas: 88 },
  { nombre: "JHOJAN JAIRO CALLAHUARA CHOQUE", ciudad: "Cochabamba", supervisor: "PAMELA FANNY CALANI LAURA", cuentas: 38 },
  { nombre: "LUIS ANGEL SIHUAIROS CANO", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas: 58 },
  { nombre: "MARCO ANTONIO ESCOBAR ALVAREZ", ciudad: "Santa Cruz", supervisor: "BEATRIZ OVIEDO OVIEDO", cuentas: 22 },
  { nombre: "PABLO SANTIAGO PEREZ NAVA", ciudad: "Cochabamba", supervisor: "PAMELA FANNY CALANI LAURA", cuentas: 71 },
  { nombre: "RENE NUÑEZ SOLIS", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas: 52 },
  { nombre: "REYNA IVONNE CALLE NINA", ciudad: "La Paz", supervisor: "CLAUDIA SHASKIA CALLE NINA", cuentas: 60 }
]

const STATIC_BILLE_DATA = [
  { nombre: "BRUNO ROCHA PEREIRA", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas: 58 },
  { nombre: "CAMILA ANDREA LOZA MERINO", ciudad: "La Paz", supervisor: "GERCY EVER ERGUETA KIPPES", cuentas: 42 },
  { nombre: "DANIELA ASCARRAGA DOMINGUEZ", ciudad: "Santa Cruz", supervisor: "JOSE GUTIERREZ PEDRAZA", cuentas: 72 },
  { nombre: "GABRIELA QUIÑONES YPORRE", ciudad: "Santa Cruz", supervisor: "DELIA JORDAN FACUSSE", cuentas: 86 },
  { nombre: "JHENIFER LUCERO SERRUDO LLAMPA", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas: 65 },
  { nombre: "JOHANNA CASSANDRA CHAVEZ VALERIANO", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas: 30 },
  { nombre: "JOSÉ OLAF ROJAS CONDARCO", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas: 56 },
  { nombre: "LUIS ANGEL SIHUAIROS CANO", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas: 61 },
  { nombre: "RENE NUÑEZ SOLIS", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas: 71 },
  { nombre: "REYNA IVONNE CALLE NINA", ciudad: "La Paz", supervisor: "CLAUDIA SHASKIA CALLE NINA", cuentas: 35 },
  { nombre: "RUBEN ANTONIO HINOJOSA TUPA", ciudad: "La Paz", supervisor: "CLAUDIA SHASKIA CALLE NINA", cuentas: 28 },
  { nombre: "SARAI VANESA TERAN GONZALES", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas: 59 }
]

const META_CONFIG = {
  BNB: {
    title: "INCENTIVO BNB (Premium)",
    color: "bg-emerald-600",
    steps: [
      { limit: 55, prize: "Bs. 40", code: "Bronce" },
      { limit: 70, prize: "Bs. 80", code: "Plata" },
      { limit: 85, prize: "Bs. 150", code: "Oro" }
    ]
  },
  BILLE: {
    title: "INCENTIVO BILLE (Estándar)",
    color: "bg-indigo-600",
    steps: [
      { limit: 55, prize: "Bs. 20", code: "Bronce" },
      { limit: 70, prize: "Bs. 40", code: "Plata" },
      { limit: 85, prize: "Bs. 70", code: "Oro" }
    ]
  }
}

export default function App() {
  const [apiData, setApiData] = useState(null)
  const [lastUpdate, setLastUpdate] = useState("Cargando...")
  const [activeProject, setActiveProject] = useState('BNB')
  const [activeSection, setActiveSection] = useState('podium')
  const [selCity, setSelCity] = useState('ALL')
  const [selSup, setSelSup] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Estado de la Calculadora de Brechas
  const [simulatedProd, setSimulatedProd] = useState(45)

  useEffect(() => {
    async function loadData() {
      const res = await fetchIncentivosData()
      if (res && res.bnb_data && res.bille_data) {
        setApiData(res)
        setLastUpdate(res.fecha_actualizacion || new Date().toLocaleString())
      } else {
        setLastUpdate(new Date().toLocaleString())
      }
    }
    loadData()
  }, [])

  // Dataset activo según el proyecto seleccionado
  const rawSet = useMemo(() => {
    if (apiData) {
      return activeProject === 'BNB' ? apiData.bnb_data : apiData.bille_data
    }
    return activeProject === 'BNB' ? STATIC_BNB_DATA : STATIC_BILLE_DATA
  }, [apiData, activeProject])

  const config = META_CONFIG[activeProject]

  // Ciudades y Supervisores distintos para los botones de filtro
  const distinctCities = useMemo(() => {
    const set = Array.from(new Set(rawSet.map(d => d.ciudad))).filter(Boolean).sort()
    return ['ALL', ...set]
  }, [rawSet])

  const distinctSups = useMemo(() => {
    const set = Array.from(new Set(rawSet.map(d => d.supervisor))).filter(Boolean).sort()
    return ['ALL', ...set]
  }, [rawSet])

  // Datos filtrados
  const filteredData = useMemo(() => {
    return rawSet
      .filter(item => {
        const mCity = selCity === 'ALL' || item.ciudad === selCity
        const mSup = selSup === 'ALL' || item.supervisor === selSup
        const mSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        return mCity && mSup && mSearch
      })
      .sort((a, b) => b.cuentas - a.cuentas)
  }, [rawSet, selCity, selSup, searchTerm])

  // KPIs
  const kpis = useMemo(() => {
    let totalCuentas = 0
    let habilitados = 0
    filteredData.forEach(item => {
      totalCuentas += item.cuentas
      if (item.cuentas >= 55) habilitados++
    })
    return {
      totalCuentas,
      habilitados,
      staffCount: filteredData.length
    }
  }, [filteredData])

  // Burbujas dinámicas
  const bubbles = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        lider: "Sin registros comerciales en esta zona.",
        racha: "Ninguna racha activa actualmente.",
        plaza: "No se detecta plaza dominante."
      }
    }
    const t1 = filteredData[0]
    const t2 = filteredData[1]

    const liderMsg = `Avance Extraordinario: El activador ${t1.nombre} lidera la tabla con ${t1.cuentas} cuentas registradas.`
    let rachaMsg = "Racha Sólida: El primer lugar mantiene un liderazgo firme y aislado frente a la competencia directa."

    if (t2 && (t1.cuentas - t2.cuentas <= 1)) {
      rachaMsg = `Racha en Peligro: Competencia al límite. ${t2.nombre} pisa el podio a solo 1 cuenta de distancia.`
    }

    const ciudadesTop = filteredData.slice(0, 3).map(x => x.ciudad)
    const ciudadFrecuente = ciudadesTop.sort((a, b) => ciudadesTop.filter(v => v === a).length - ciudadesTop.filter(v => v === b).length).pop() || "N/A"
    const plazaMsg = `Plaza con Mayor Tracción: La sucursal de ${ciudadFrecuente.toUpperCase()} se mantiene dominante en el top 3.`

    return { lider: liderMsg, racha: rachaMsg, plaza: plazaMsg }
  }, [filteredData])

  // Top 3 y Runners 4-10
  const t1 = filteredData[0] || { nombre: "-", ciudad: "-", cuentas: 0 }
  const t2 = filteredData[1] || { nombre: "-", ciudad: "-", cuentas: 0 }
  const t3 = filteredData[2] || { nombre: "-", ciudad: "-", cuentas: 0 }
  const runners = filteredData.slice(3, 10)

  // Cálculo predictivo para la calculadora
  const calcState = useMemo(() => {
    const inputVal = parseInt(simulatedProd) || 0
    const steps = config.steps
    const c55 = steps[0].limit; const c70 = steps[1].limit; const c85 = steps[2].limit

    if (inputVal >= c55) {
      if (inputVal >= c85) {
        return {
          unlocked: true,
          statusText: `🏆 META ORO ALCANZADA (${steps[2].prize})`,
          statusClass: "text-xs font-black text-emerald-600",
          nextText: "Tope máximo de campaña establecido alcanzado.",
          prizeVal: steps[2].prize,
          levelBadge: "🥇 ORO",
          badgeClass: "bg-yellow-400 text-slate-950 px-2 py-0.5 rounded font-black text-[9px] uppercase animate-pulse"
        }
      } else if (inputVal >= c70) {
        return {
          unlocked: true,
          statusText: `🥈 META PLATA ALCANZADA (${steps[1].prize})`,
          statusClass: "text-xs font-black text-blue-600",
          nextText: `Faltan ${c85 - inputVal} cuentas para saltar a Oro.`,
          prizeVal: steps[1].prize,
          levelBadge: "🥈 PLATA",
          badgeClass: "bg-blue-600 text-white px-2 py-0.5 rounded font-black text-[9px] uppercase"
        }
      } else {
        return {
          unlocked: true,
          statusText: `🥉 META BRONCE ALCANZADA (${steps[0].prize})`,
          statusClass: "text-xs font-black text-amber-500",
          nextText: `Faltan ${c70 - inputVal} cuentas para saltar a Plata.`,
          prizeVal: steps[0].prize,
          levelBadge: "🥉 BRONCE",
          badgeClass: "bg-amber-700 text-white px-2 py-0.5 rounded font-black text-[9px] uppercase"
        }
      }
    } else {
      return {
        unlocked: false,
        statusText: `❌ SIN BONO ACTIVO`,
        statusClass: "text-xs font-black text-red-500",
        nextText: `Faltan ${c55 - inputVal} cuentas para abrir Bronce.`,
        prizeVal: "Bs. 0",
        levelBadge: "SIN BONO",
        badgeClass: "bg-slate-500 text-white px-2 py-0.5 rounded font-black text-[9px] uppercase"
      }
    }
  }, [simulatedProd, config])

  const handleSetProject = (proj) => {
    setActiveProject(proj)
    setSelCity('ALL')
    setSelSup('ALL')
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12 text-slate-900 antialiased font-sans text-sm">

      {/* HEADER MÓVIL */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-md border-b-4 border-blue-500 flex justify-between items-center">
        <div>
          <span className="bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-500/20">
            BEX Celular V3 (React)
          </span>
          <h1 className="text-base font-black tracking-tight mt-1">📊 MONITOREO BEX</h1>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs border border-amber-400">
            <span>⏰</span>
            <span>Actualización: {lastUpdate}</span>
          </div>
        </div>
        <div className="bg-white text-blue-950 font-black text-sm px-3 py-1 rounded-lg tracking-wider">
          BEX
        </div>
      </header>

      {/* PESTAÑAS PRINCIPALES: PROYECTOS */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSetProject('BNB')}
          className={`py-2.5 px-2 rounded-xl font-black text-xs text-center cursor-pointer transition-all uppercase tracking-wider ${
            activeProject === 'BNB'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border border-emerald-700 shadow-md'
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          🏦 BNB
        </button>
        <button
          onClick={() => handleSetProject('BILLE')}
          className={`py-2.5 px-2 rounded-xl font-black text-xs text-center cursor-pointer transition-all uppercase tracking-wider ${
            activeProject === 'BILLE'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border border-indigo-700 shadow-md'
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          📱 BILLE
        </button>
      </div>

      {/* PESTAÑAS SECUNDARIAS: EN CUADRÍCULA 2X2 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'rules', label: '🎯 Reglas' },
          { id: 'podium', label: '🏆 Podio Afiliadores' },
          { id: 'calc', label: '🧮 Calculadora' },
          { id: 'detail', label: '📋 Detalle y Filtros' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`py-2 px-3 rounded-xl text-[11px] uppercase tracking-wide cursor-pointer text-center shadow-xs transition-all ${
              activeSection === tab.id
                ? 'bg-slate-900 text-white border border-slate-900 font-black'
                : 'bg-white border border-slate-300 text-slate-600 font-bold hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECCIÓN 1: REGLAS + VALE DE CONSUMO */}
      {activeSection === 'rules' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-blue-900 mb-3">
              🎯 {config.title}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {config.steps.map((s, idx) => (
                <div key={idx} className={`${config.color} text-white rounded-lg p-3 text-center shadow-xs`}>
                  <div className="text-[9px] font-bold uppercase opacity-80">{s.code}</div>
                  <div className="text-base font-black my-0.5">{s.limit} Cuentas</div>
                  <div className="text-[10px] font-bold bg-black/15 py-0.5 px-1.5 rounded-sm inline-block">
                    Premio: {s.prize}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              🖼️ Visualización del Premio
            </span>
            <div className="relative rounded-lg overflow-hidden shadow-xs border border-slate-200">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
                alt="Vale de Consumo"
                className="w-full h-28 object-cover brightness-40"
              />
              <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-black tracking-widest text-amber-400 uppercase">
                      VALE DE CONSUMO DIGITAL
                    </p>
                    <p className="text-[11px] font-black tracking-tight mt-0.5">Campaña de Productividad BEX</p>
                  </div>
                  <span className="bg-white/20 backdrop-blur-xs text-[9px] font-bold px-2 py-0.5 rounded-sm border border-white/20">
                    2026
                  </span>
                </div>
                <div className="flex justify-between items-end border-t border-white/20 pt-1.5">
                  <div>
                    <p className="text-[8px] uppercase text-slate-300 font-medium">Válido para canje en</p>
                    <p className="text-[10px] font-bold text-slate-100">Establecimientos Autorizados</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md shadow-xs">
                      ¡Aplica según Meta!
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center italic font-medium">
              "Cumple tu meta semanal y desbloquea tu orden de consumo automáticamente".
            </p>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: PODIO DE AFILIADORES */}
      {activeSection === 'podium' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 text-slate-800 p-3 rounded-xl shadow-xs flex items-start gap-2">
              <span className="text-base mt-0.5">📢</span>
              <p className="text-xs font-semibold leading-normal">{bubbles.lider}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-slate-800 p-3 rounded-xl shadow-xs flex items-start gap-2">
              <span className="text-base mt-0.5">⚡</span>
              <p className="text-xs font-semibold leading-normal">{bubbles.racha}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 text-slate-800 p-3 rounded-xl shadow-xs flex items-start gap-2">
              <span className="text-base mt-0.5">📍</span>
              <p className="text-xs font-semibold leading-normal">{bubbles.plaza}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center mb-3">
              ⭐ TOP 3 - LÍDERES SEMANALES
            </h2>
            <div className="flex justify-center items-end gap-2 max-w-xs mx-auto pt-2">
              <div className="flex flex-col items-center w-1/3 text-center">
                <div className="text-[8px] font-black truncate w-full text-slate-700">{t2.nombre.split(' ')[0]}</div>
                <div className="text-[9px] font-black text-slate-500">{t2.cuentas} Cts</div>
                <div className="w-full bg-slate-200 text-slate-700 font-black text-xs py-2 rounded-t-md mt-1">2°</div>
              </div>
              <div className="flex flex-col items-center w-1/3 text-center">
                <div className="text-[9px] font-black truncate w-full text-amber-600">👑 {t1.nombre.split(' ')[0]}</div>
                <div className="text-[10px] font-black text-amber-500">{t1.cuentas} Cts</div>
                <div className="w-full bg-amber-400 text-white font-black text-sm py-4 rounded-t-md mt-1">1°</div>
              </div>
              <div className="flex flex-col items-center w-1/3 text-center">
                <div className="text-[8px] font-black truncate w-full text-amber-900">{t3.nombre.split(' ')[0]}</div>
                <div className="text-[9px] font-black text-amber-700">{t3.cuentas} Cts</div>
                <div className="w-full bg-amber-700 text-white font-black text-xs py-1.5 rounded-t-md mt-1">3°</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
              🏃 RECOLA DE COMPETIDORES (4° AL 10°)
            </h3>
            <div className="space-y-2">
              {runners.length === 0 ? (
                <div className="text-center text-slate-400 py-3 text-xs bg-white rounded-lg border border-slate-200">
                  Fila vacía o sin suficientes competidores.
                </div>
              ) : (
                runners.map((item, index) => {
                  const gap = Math.max(55 - item.cuentas, 0)
                  const gapPill = gap > 0 ? (
                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">-{gap} cts</span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Ok</span>
                  )

                  return (
                    <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-xs">
                      <div>
                        <div className="text-xs font-black text-slate-800">
                          {index + 4}° Lugar - {item.nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          📍 {item.ciudad} | 👩‍💼 {item.supervisor.split(' ')[0]}
                        </div>
                      </div>
                      <div className="text-right text-xs font-black">
                        <div className="text-blue-900">{item.cuentas} Cts</div>
                        <div className="text-[9px] mt-1">{gapPill}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: CALCULADORA + FLYER FESTIVO */}
      {activeSection === 'calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-purple-600 p-4 shadow-sm space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-purple-700">
              🧮 CALCULADORA DE BRECHAS
            </h3>
            <div className="space-y-1">
              <label htmlFor="calc-sim-input" className="text-[11px] font-bold text-slate-400">
                Producción Simulada (Cuentas):
              </label>
              <input
                id="calc-sim-input"
                type="number"
                value={simulatedProd}
                onChange={e => setSimulatedProd(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-lg font-black text-center focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div className="bg-purple-50 border-l-4 border-purple-600 rounded-r-lg p-3 space-y-0.5">
              <div className={calcState.statusClass}>{calcState.statusText}</div>
              <div className="text-[11px] font-medium text-slate-700">{calcState.nextText}</div>
            </div>
          </div>

          {calcState.unlocked && (
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-2xl p-5 shadow-xl border-4 border-white text-white text-center space-y-4 relative overflow-hidden animate-flyer">
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
              <div className="flex justify-center gap-3 text-3xl">
                <span>🎉</span><span>🏆</span><span>✨</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black tracking-tighter uppercase drop-shadow-md">¡FELICITACIONES!</h4>
                <p className="text-xs font-bold tracking-wide uppercase text-yellow-900 bg-white/40 px-3 py-1 rounded-full inline-block">
                  Meta Superada Exitosamente
                </p>
              </div>
              <div className="bg-slate-900/90 text-white rounded-xl p-4 border border-amber-300/30 shadow-inner space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">VALE DE CONSUMO AUTORIZADO</p>
                <div className="text-2xl font-black text-yellow-400">{calcState.prizeVal}</div>
                <div className="text-[11px] font-bold text-slate-300 border-t border-white/10 pt-2 flex justify-between items-center">
                  <span>NIVEL CONQUISTADO:</span>
                  <span className={calcState.badgeClass}>{calcState.levelBadge}</span>
                </div>
              </div>
              <p className="text-[10px] font-semibold text-orange-950 italic">
                "Tu esfuerzo se convierte en recompensas directas. Sigue sumando con BEX."
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 4: DETALLE OPERATIVO Y FILTROS */}
      {activeSection === 'detail' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Prod</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">{kpis.totalCuentas}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Bonos</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">{kpis.habilitados}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Red</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">{kpis.staffCount}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-xs">
            <div>
              <div className="text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1.5">📍 Ciudad:</div>
              <div className="flex flex-wrap gap-1">
                {distinctCities.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelCity(c)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selCity === c
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {c === 'ALL' ? '🌐 Todas' : c}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2">
              <div className="text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1.5">👩‍💼 Supervisor:</div>
              <div className="flex flex-wrap gap-1">
                {distinctSups.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelSup(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      selSup === s
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {s === 'ALL' ? '👥 Todos' : s.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar asesor..."
            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100"
          />

          <div className="space-y-2">
            {filteredData.length === 0 ? (
              <div className="text-center text-slate-400 py-6 font-bold bg-white rounded-xl border border-slate-200">
                ⚠️ Sin coincidencias.
              </div>
            ) : (
              filteredData.map((item, idx) => {
                const barPct = Math.min((item.cuentas / 55) * 100, 100).toFixed(0)
                let semColor = 'bg-red-500'
                if (item.cuentas >= 55) semColor = 'bg-emerald-500'
                else if (item.cuentas >= 25) semColor = 'bg-amber-500'

                let badge = null
                if (item.cuentas >= 85) badge = <span className="text-[9px] font-black bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-sm">🥇 ORO</span>
                else if (item.cuentas >= 70) badge = <span className="text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-sm">🥈 PLATA</span>
                else if (item.cuentas >= 55) badge = <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-sm">🥉 BRONCE</span>
                else badge = <span className="text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-sm">SIN BONO</span>

                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{item.nombre}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          📍 {item.ciudad.toUpperCase()} | 👩‍💼 {item.supervisor}
                        </p>
                      </div>
                      {badge}
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-center shrink-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Cuentas</span>
                        <span className="text-sm font-black text-blue-900 block">{item.cuentas}</span>
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                          <span>Progreso</span>
                          <span>{item.cuentas}/55 cts</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${semColor} rounded-full`} style={{ width: `${barPct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="text-center text-[9px] font-bold text-slate-400 pt-2 uppercase tracking-wider">
        BEX &copy; 2026
      </footer>

    </div>
  )
}
