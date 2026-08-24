import React, { useState, useEffect, useMemo } from 'react'
import { fetchIncentivosData } from './api'

const STATIC_BNB_DATA = [
  { nombre: "DANIELA ANDREA VARGAS ARÉVALO", ciudad: "La Paz", supervisor: "MILENKA ADRIANA ORDOÑEZ NUÑEZ", cuentas_bnb: 62, cuentas_bille: 12 },
  { nombre: "DIEGO ARMANDO COLQUE COLQUE", ciudad: "Cochabamba", supervisor: "PAMELA FANNY CALANI LAURA", cuentas_bnb: 45, cuentas_bille: 8 },
  { nombre: "GABRIELA QUIÑONES YPORRE", ciudad: "Santa Cruz", supervisor: "DELIA JORDAN FACUSSE", cuentas_bnb: 65, cuentas_bille: 72 },
  { nombre: "JHENIFER LUCERO SERRUDO LLAMPA", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas_bnb: 68, cuentas_bille: 20 },
  { nombre: "JHOJAN JAIRO CALLAHUARA CHOQUE", ciudad: "Cochabamba", supervisor: "PAMELA FANNY CALANI LAURA", cuentas_bnb: 38, cuentas_bille: 5 },
  { nombre: "LUIS ANGEL SIHUAIROS CANO", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas_bnb: 58, cuentas_bille: 10 },
  { nombre: "MARCO ANTONIO ESCOBAR ALVAREZ", ciudad: "Santa Cruz", supervisor: "BEATRIZ OVIEDO OVIEDO", cuentas_bnb: 22, cuentas_bille: 4 },
  { nombre: "PABLO SANTIAGO PEREZ NAVA", ciudad: "Cochabamba", supervisor: "PAMELA FANNY CALANI LAURA", cuentas_bnb: 71, cuentas_bille: 14 },
  { nombre: "RENE NUÑEZ SOLIS", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas_bnb: 52, cuentas_bille: 9 },
  { nombre: "REYNA IVONNE CALLE NINA", ciudad: "La Paz", supervisor: "CLAUDIA SHASKIA CALLE NINA", cuentas_bnb: 60, cuentas_bille: 11 }
]

const STATIC_BILLE_DATA = [
  { nombre: "BRUNO ROCHA PEREIRA", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas_bnb: 10, cuentas_bille: 58 },
  { nombre: "CAMILA ANDREA LOZA MERINO", ciudad: "La Paz", supervisor: "GERCY EVER ERGUETA KIPPES", cuentas_bnb: 15, cuentas_bille: 42 },
  { nombre: "DANIELA ASCARRAGA DOMINGUEZ", ciudad: "Santa Cruz", supervisor: "JOSE GUTIERREZ PEDRAZA", cuentas_bnb: 20, cuentas_bille: 72 },
  { nombre: "GABRIELA QUIÑONES YPORRE", ciudad: "Santa Cruz", supervisor: "DELIA JORDAN FACUSSE", cuentas_bnb: 65, cuentas_bille: 72 },
  { nombre: "JHENIFER LUCERO SERRUDO LLAMPA", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas_bnb: 68, cuentas_bille: 70 },
  { nombre: "JOHANNA CASSANDRA CHAVEZ VALERIANO", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas_bnb: 8, cuentas_bille: 30 },
  { nombre: "JOSÉ OLAF ROJAS CONDARCO", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas_bnb: 14, cuentas_bille: 56 },
  { nombre: "LUIS ANGEL SIHUAIROS CANO", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas_bnb: 18, cuentas_bille: 61 },
  { nombre: "RENE NUÑEZ SOLIS", ciudad: "Sucre", supervisor: "JENNY CRISTINA ECHALAR MONTALVO", cuentas_bnb: 22, cuentas_bille: 71 },
  { nombre: "REYNA IVONNE CALLE NINA", ciudad: "La Paz", supervisor: "CLAUDIA SHASKIA CALLE NINA", cuentas_bnb: 12, cuentas_bille: 35 },
  { nombre: "RUBEN ANTONIO HINOJOSA TUPA", ciudad: "La Paz", supervisor: "CLAUDIA SHASKIA CALLE NINA", cuentas_bnb: 5, cuentas_bille: 28 },
  { nombre: "SARAI VANESA TERAN GONZALES", ciudad: "Cochabamba", supervisor: "HASIRA DANIELA OSINAGA CHOQUE", cuentas_bnb: 19, cuentas_bille: 59 }
]

const CAMPAIGN_RULES = {
  BNB: { target: 60, prize: "Bs. 150", title: "INCENTIVO PROYECTO BNB", color: "bg-emerald-600" },
  BILLE: { target: 70, prize: "Bs. 150", title: "INCENTIVO PROYECTO BILLE", color: "bg-indigo-600" },
  DOBLE: { bnbTarget: 60, billeTarget: 70, prize: "Bs. 300", title: "BONO DOBLE META" }
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
  const [simBnb, setSimBnb] = useState(55)
  const [simBille, setSimBille] = useState(45)

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

  const rawSet = useMemo(() => {
    if (apiData) {
      return activeProject === 'BNB' ? apiData.bnb_data : apiData.bille_data
    }
    return activeProject === 'BNB' ? STATIC_BNB_DATA : STATIC_BILLE_DATA
  }, [apiData, activeProject])

  const projectRule = CAMPAIGN_RULES[activeProject]

  // Normalizar ítems con cuentas y metas según correo.txt
  const processedSet = useMemo(() => {
    return rawSet.map(item => {
      const cbnb = item.cuentas_bnb ?? (activeProject === 'BNB' ? item.cuentas : 0)
      const cbille = item.cuentas_bille ?? (activeProject === 'BILLE' ? item.cuentas : 0)
      const cproj = activeProject === 'BNB' ? cbnb : cbille
      const target = projectRule.target

      const isDoble = (cbnb >= 60 && cbille >= 70)
      const isTargetMet = cproj >= target

      let statusBadge = "SIN BONO"
      let prizeText = "Bs. 0"

      if (isDoble) {
        statusBadge = "🔥 DOBLE META (Bs. 300)"
        prizeText = "Bs. 300"
      } else if (isTargetMet) {
        statusBadge = "🎯 META CUMPLIDA (Bs. 150)"
        prizeText = "Bs. 150"
      } else {
        const gap = target - cproj
        statusBadge = `EN PROGRESO (-${gap} cts)`
      }

      return {
        ...item,
        cuentas: cproj,
        cuentas_bnb: cbnb,
        cuentas_bille: cbille,
        statusBadge,
        prizeText,
        isDoble,
        isTargetMet
      }
    })
  }, [rawSet, activeProject, projectRule])

  // Filtros dinámicos
  const distinctCities = useMemo(() => {
    const set = Array.from(new Set(processedSet.map(d => d.ciudad))).filter(Boolean).sort()
    return ['ALL', ...set]
  }, [processedSet])

  const distinctSups = useMemo(() => {
    const set = Array.from(new Set(processedSet.map(d => d.supervisor))).filter(Boolean).sort()
    return ['ALL', ...set]
  }, [processedSet])

  const filteredData = useMemo(() => {
    return processedSet
      .filter(item => {
        const mCity = selCity === 'ALL' || item.ciudad === selCity
        const mSup = selSup === 'ALL' || item.supervisor === selSup
        const mSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        return mCity && mSup && mSearch
      })
      .sort((a, b) => b.cuentas - a.cuentas)
  }, [processedSet, selCity, selSup, searchTerm])

  // KPIs Totales según correo.txt
  const kpis = useMemo(() => {
    let totalCuentas = 0
    let habilitados = 0
    let dobles = 0
    filteredData.forEach(item => {
      totalCuentas += item.cuentas
      if (item.isTargetMet || item.isDoble) habilitados++
      if (item.isDoble) dobles++
    })
    return {
      totalCuentas,
      habilitados,
      dobles,
      staffCount: filteredData.length
    }
  }, [filteredData])

  // Burbujas analíticas
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

    const liderMsg = `Avance Destacado: El afiliador ${t1.nombre} lidera la tabla con ${t1.cuentas} cuentas en ${activeProject}.`
    let rachaMsg = "Liderazgo Firme: El primer lugar mantiene ventaja frente a la competencia."

    if (t2 && (t1.cuentas - t2.cuentas <= 1)) {
      rachaMsg = `Competencia al Límite: ${t2.nombre} se encuentra a solo 1 cuenta de distancia del 1° lugar.`
    }

    const ciudadesTop = filteredData.slice(0, 3).map(x => x.ciudad)
    const ciudadFrecuente = ciudadesTop.sort((a, b) => ciudadesTop.filter(v => v === a).length - ciudadesTop.filter(v => v === b).length).pop() || "N/A"
    const plazaMsg = `Sucursal Dominante: ${ciudadFrecuente.toUpperCase()} cuenta con mayor concentración en el Top 3.`

    return { lider: liderMsg, racha: rachaMsg, plaza: plazaMsg }
  }, [filteredData, activeProject])

  // Podio y Top 4-10
  const t1 = filteredData[0] || { nombre: "-", ciudad: "-", cuentas: 0 }
  const t2 = filteredData[1] || { nombre: "-", ciudad: "-", cuentas: 0 }
  const t3 = filteredData[2] || { nombre: "-", ciudad: "-", cuentas: 0 }
  const runners = filteredData.slice(3, 10)

  // Lógica de Calculadora Predictiva (correo.txt: BNB 60, Bille 70, Doble 300)
  const calcState = useMemo(() => {
    const valBnb = parseInt(simBnb) || 0
    const valBille = parseInt(simBille) || 0
    const target = projectRule.target

    const isDoble = (valBnb >= 60 && valBille >= 70)
    const activeVal = activeProject === 'BNB' ? valBnb : valBille
    const isTargetMet = activeVal >= target

    if (isDoble) {
      return {
        unlocked: true,
        statusText: "🔥 ¡BONO DOBLE META CUMPLIDO! (Bs. 300)",
        statusClass: "text-xs font-black text-amber-600",
        nextText: "Cumpliste las metas de BNB (60 cts) y Bille (70 cts). ¡Ganaste Bs. 300!",
        prizeVal: "Bs. 300",
        levelBadge: "🔥 DOBLE META",
        badgeClass: "bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black text-[9px] uppercase animate-pulse"
      }
    } else if (isTargetMet) {
      const gapDoble = activeProject === 'BNB' ? Math.max(70 - valBille, 0) : Math.max(60 - valBnb, 0)
      return {
        unlocked: true,
        statusText: `🎯 META CUMPLIDA EN ${activeProject} (Bs. 150)`,
        statusClass: "text-xs font-black text-emerald-600",
        nextText: gapDoble > 0 ? `Faltan ${gapDoble} cuentas en ${activeProject === 'BNB' ? 'Bille' : 'BNB'} para activar el Bono Doble Meta de Bs. 300.` : "Meta individual alcanzada.",
        prizeVal: "Bs. 150",
        levelBadge: `🎯 META ${activeProject}`,
        badgeClass: "bg-emerald-600 text-white px-2 py-0.5 rounded font-black text-[9px] uppercase"
      }
    } else {
      const gap = target - activeVal
      return {
        unlocked: false,
        statusText: `❌ SIN META ALCANZADA EN ${activeProject}`,
        statusClass: "text-xs font-black text-red-500",
        nextText: `Faltan ${gap} cuentas en ${activeProject} para alcanzar la meta de ${target} y obtener el Vale de Bs. 150.`,
        prizeVal: "Bs. 0",
        levelBadge: "EN PROGRESO",
        badgeClass: "bg-slate-500 text-white px-2 py-0.5 rounded font-black text-[9px] uppercase"
      }
    }
  }, [simBnb, simBille, activeProject, projectRule])

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
            BEX Celular V3 (Camp. Cierre Agosto)
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
          🏦 BNB (Meta 60)
        </button>
        <button
          onClick={() => handleSetProject('BILLE')}
          className={`py-2.5 px-2 rounded-xl font-black text-xs text-center cursor-pointer transition-all uppercase tracking-wider ${
            activeProject === 'BILLE'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border border-indigo-700 shadow-md'
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          📱 BILLE (Meta 70)
        </button>
      </div>

      {/* PESTAÑAS SECUNDARIAS: EN CUADRÍCULA 2X2 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'rules', label: '🎯 Reglas Oficiales' },
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

      {/* SECCIÓN 1: REGLAS OFICIALES SEGÚN CORREO.TXT */}
      {activeSection === 'rules' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-blue-900">
                🎯 CAMPAÑA DE INCENTIVOS POR PRODUCCIÓN
              </h2>
              <span className="text-[9px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded-full">
                24 - 31 Ago 2026
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-3">
              {/* Tarjeta BNB */}
              <div className="bg-emerald-600 text-white rounded-xl p-3 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
                    PROYECTO BNB
                  </span>
                  <span className="text-xs font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                    Premio: Bs. 150
                  </span>
                </div>
                <div className="text-base font-black">Meta: 60 Cuentas</div>
                <p className="text-[10px] opacity-90">
                  Vale de consumo digital por alcanzar o superar las 60 cuentas no duplicadas en el periodo.
                </p>
              </div>

              {/* Tarjeta BILLE */}
              <div className="bg-indigo-600 text-white rounded-xl p-3 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
                    PROYECTO BILLE
                  </span>
                  <span className="text-xs font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                    Premio: Bs. 150
                  </span>
                </div>
                <div className="text-base font-black">Meta: 70 Cuentas</div>
                <p className="text-[10px] opacity-90">
                  Vale de consumo digital por alcanzar o superar las 70 cuentas no duplicadas en el periodo.
                </p>
              </div>

              {/* Tarjeta BONO DOBLE META */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 rounded-xl p-3 shadow-md space-y-1 border border-amber-300">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-400 px-2 py-0.5 rounded">
                    🔥 BONO DOBLE META
                  </span>
                  <span className="text-xs font-black bg-slate-950 text-yellow-300 px-2 py-0.5 rounded">
                    Premio Total: Bs. 300
                  </span>
                </div>
                <div className="text-sm font-black text-slate-950">
                  Cumplir BNB (60 cts) + Bille (70 cts)
                </div>
                <p className="text-[10px] text-slate-900 font-semibold">
                  Si un afiliador cumple ambos objetivos cobrará un vale de consumo de Bs. 300.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-[10px] text-slate-600">
            <p className="font-bold text-slate-800 uppercase">📌 Condiciones operativas:</p>
            <ul className="list-disc pl-4 space-y-0.5 font-medium">
              <li>Para la determinación de beneficiarios se considerará la <strong>producción no duplicada</strong>.</li>
              <li>El incentivo aplica de manera independiente para cada proyecto conforme al cumplimiento de las metas.</li>
            </ul>
          </div>

          {/* VISUALIZACIÓN DEL PREMIO */}
          <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              🖼️ Visualización del Premio Digital
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
                    <p className="text-[11px] font-black tracking-tight mt-0.5">Cierre de Agosto BEX 2026</p>
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
                      Bs. 150 / Bs. 300
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center italic font-medium">
              "Alcanza tu meta de cierre de mes y desbloquea tu orden de consumo automáticamente".
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
              ⭐ TOP 3 - LÍDERES PROYECTO {activeProject}
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
                  const target = projectRule.target
                  const gap = Math.max(target - item.cuentas, 0)
                  const gapPill = gap > 0 ? (
                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">-{gap} cts</span>
                  ) : (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">Meta OK</span>
                  )

                  return (
                    <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-xs">
                      <div>
                        <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>{index + 4}° Lugar - {item.nombre}</span>
                          {item.isDoble && <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">DOBLE</span>}
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

      {/* SECCIÓN 3: CALCULADORA DE BRECHAS Y FLYER FESTIVO */}
      {activeSection === 'calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-purple-600 p-4 shadow-sm space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-purple-700">
              🧮 CALCULADORA DE BRECHAS Y PREMIOS
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="sim-bnb" className="text-[10px] font-bold text-slate-500">
                  Cuentas BNB (Meta 60):
                </label>
                <input
                  id="sim-bnb"
                  type="number"
                  value={simBnb}
                  onChange={e => setSimBnb(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-base font-black text-center focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="sim-bille" className="text-[10px] font-bold text-slate-500">
                  Cuentas BILLE (Meta 70):
                </label>
                <input
                  id="sim-bille"
                  type="number"
                  value={simBille}
                  onChange={e => setSimBille(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-base font-black text-center focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-600 rounded-r-lg p-3 space-y-0.5">
              <div className={calcState.statusClass}>{calcState.statusText}</div>
              <div className="text-[11px] font-medium text-slate-700">{calcState.nextText}</div>
            </div>
          </div>

          {/* FLYER FESTIVO DINÁMICO */}
          {calcState.unlocked && (
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 rounded-2xl p-5 shadow-xl border-4 border-white text-white text-center space-y-4 relative overflow-hidden animate-flyer">
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>

              <div className="flex justify-center gap-3 text-3xl">
                <span>🎉</span><span>🏆</span><span>✨</span>
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-black tracking-tighter uppercase drop-shadow-md">
                  ¡FELICITACIONES!
                </h4>
                <p className="text-xs font-bold tracking-wide uppercase text-yellow-900 bg-white/40 px-3 py-1 rounded-full inline-block">
                  Meta Superada Exitosamente
                </p>
              </div>

              <div className="bg-slate-900/90 text-white rounded-xl p-4 border border-amber-300/30 shadow-inner space-y-2">
                <p className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                  VALE DE CONSUMO AUTORIZADO
                </p>
                <div className="text-3xl font-black text-yellow-400">{calcState.prizeVal}</div>
                <div className="text-[11px] font-bold text-slate-300 border-t border-white/10 pt-2 flex justify-between items-center">
                  <span>ESTADO:</span>
                  <span className={calcState.badgeClass}>{calcState.levelBadge}</span>
                </div>
              </div>

              <p className="text-[10px] font-semibold text-orange-950 italic">
                "Tu producción impulsa el cierre de mes. ¡Sigue sumando con BEX!"
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 4: DETALLE OPERATIVO Y FILTROS */}
      {activeSection === 'detail' && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-1">
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[8px] font-bold uppercase text-slate-400 block">Total Prod</span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">{kpis.totalCuentas}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[8px] font-bold uppercase text-slate-400 block">Habilitados</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{kpis.habilitados}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[8px] font-bold uppercase text-slate-400 block">Dobles</span>
              <span className="text-sm font-black text-amber-600 block mt-0.5">{kpis.dobles}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[8px] font-bold uppercase text-slate-400 block">Red</span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">{kpis.staffCount}</span>
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
                const target = projectRule.target
                const barPct = Math.min((item.cuentas / target) * 100, 100).toFixed(0)
                let semColor = 'bg-red-500'
                if (item.cuentas >= target) semColor = 'bg-emerald-500'
                else if (item.cuentas >= target * 0.5) semColor = 'bg-amber-500'

                let badge = null
                if (item.isDoble) {
                  badge = <span className="text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-sm">🔥 DOBLE META (Bs. 300)</span>
                } else if (item.isTargetMet) {
                  badge = <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-sm">🎯 META CUMPLIDA (Bs. 150)</span>
                } else {
                  badge = <span className="text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-sm">EN PROGRESO</span>
                }

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
                      <div className="text-center shrink-0 min-w-[3rem]">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block">{activeProject}</span>
                        <span className="text-sm font-black text-blue-900 block">{item.cuentas} cts</span>
                        <span className="text-[8px] text-slate-500 block">
                          {activeProject === 'BNB' ? `Bille: ${item.cuentas_bille}` : `BNB: ${item.cuentas_bnb}`}
                        </span>
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                          <span>Progreso {activeProject}</span>
                          <span>{item.cuentas}/{target} cts</span>
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
        BEX &copy; 2026 - Campaña de Cierre de Mes (24 - 31 Ago)
      </footer>

    </div>
  )
}
