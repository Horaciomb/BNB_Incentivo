import React, { useState, useEffect, useMemo } from 'react'
import { fetchIncentivosData } from './api'
import {
  Target, Trophy, Calculator, ListFilter,
  MapPin, Users, Search, AlertCircle, Flame, Info,
  TrendingUp, Zap, Award, CheckCircle2
} from 'lucide-react'

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
  BNB: { target: 60, prize: "Bs. 150", title: "INCENTIVO PROYECTO BNB" },
  BILLE: { target: 70, prize: "Bs. 150", title: "INCENTIVO PROYECTO BILLE" },
  DOBLE: { bnbTarget: 60, billeTarget: 70, prize: "Bs. 300", title: "BONO DOBLE META" }
}

const SECTION_TABS = [
  { id: 'rules', label: 'Reglas Oficiales', Icon: Target },
  { id: 'podium', label: 'Podio Afiliadores', Icon: Trophy },
  { id: 'calc', label: 'Calculadora', Icon: Calculator },
  { id: 'detail', label: 'Detalle y Filtros', Icon: ListFilter }
]

export default function App() {
  const [apiData, setApiData] = useState(null)
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
  const brandBg = activeProject === 'BNB' ? 'bg-bnb' : 'bg-bille'
  const brandText = activeProject === 'BNB' ? 'text-bnb-dark' : 'text-bille-dark'
  const brandLight = activeProject === 'BNB' ? 'bg-bnb-light' : 'bg-bille-light'
  const brandBorder = activeProject === 'BNB' ? 'border-bnb/30' : 'border-bille/30'

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
        statusBadge = "DOBLE META (Bs. 300)"
        prizeText = "Bs. 300"
      } else if (isTargetMet) {
        statusBadge = "META CUMPLIDA (Bs. 150)"
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

    const glassBadge = "bg-white/15 text-white border border-white/20 px-2 py-0.5 rounded-md font-semibold text-[9px] uppercase tracking-wide"

    if (isDoble) {
      return {
        unlocked: true,
        icon: 'doble',
        statusText: "Bono doble meta cumplido (Bs. 300)",
        statusClass: "text-xs font-semibold text-amber-700",
        nextText: "Cumpliste las metas de BNB (60 cts) y Bille (70 cts). Ganaste Bs. 300.",
        prizeVal: "Bs. 300",
        levelBadge: "Doble meta",
        badgeClass: glassBadge
      }
    } else if (isTargetMet) {
      const gapDoble = activeProject === 'BNB' ? Math.max(70 - valBille, 0) : Math.max(60 - valBnb, 0)
      return {
        unlocked: true,
        icon: 'meta',
        statusText: `Meta cumplida en ${activeProject} (Bs. 150)`,
        statusClass: `text-xs font-semibold ${brandText}`,
        nextText: gapDoble > 0 ? `Faltan ${gapDoble} cuentas en ${activeProject === 'BNB' ? 'Bille' : 'BNB'} para activar el Bono Doble Meta de Bs. 300.` : "Meta individual alcanzada.",
        prizeVal: "Bs. 150",
        levelBadge: `Meta ${activeProject}`,
        badgeClass: glassBadge
      }
    } else {
      const gap = target - activeVal
      return {
        unlocked: false,
        icon: 'none',
        statusText: `Sin meta alcanzada en ${activeProject}`,
        statusClass: "text-xs font-semibold text-red-500",
        nextText: `Faltan ${gap} cuentas en ${activeProject} para alcanzar la meta de ${target} y obtener el Vale de Bs. 150.`,
        prizeVal: "Bs. 0",
        levelBadge: "En progreso",
        badgeClass: glassBadge
      }
    }
  }, [simBnb, simBille, activeProject, projectRule, brandText])

  const handleSetProject = (proj) => {
    setActiveProject(proj)
    setSelCity('ALL')
    setSelSup('ALL')
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12 text-slate-900 antialiased font-sans text-sm">

      {/* HEADER MÓVIL */}
      <header className="relative overflow-hidden bg-slate-900 text-white rounded-xl p-4 shadow-sm flex justify-between items-center">
        <h1 className="text-lg font-semibold tracking-tight text-white">Campaña Cierre Agosto</h1>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="bg-white text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg">
            BEX
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-gradient-to-r from-bnb to-bille"></div>
      </header>

      {/* PESTAÑAS PRINCIPALES: PROYECTOS */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSetProject('BNB')}
          className={`py-3 px-2 rounded-lg font-semibold text-xs text-center cursor-pointer transition-[background-color,box-shadow,transform] active:scale-[0.96] ${
            activeProject === 'BNB'
              ? 'bg-bnb-dark text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          BNB · Meta 60
        </button>
        <button
          onClick={() => handleSetProject('BILLE')}
          className={`py-3 px-2 rounded-lg font-semibold text-xs text-center cursor-pointer transition-[background-color,box-shadow,transform] active:scale-[0.96] ${
            activeProject === 'BILLE'
              ? 'bg-bille-dark text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          BILLE · Meta 70
        </button>
      </div>

      {/* PESTAÑAS SECUNDARIAS: EN CUADRÍCULA 2X2 */}
      <div className="grid grid-cols-2 gap-2">
        {SECTION_TABS.map(tab => {
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-[11px] font-semibold cursor-pointer text-center shadow-xs transition-[background-color,color,border-color] active:scale-[0.96] ${
                activeSection === tab.id
                  ? 'bg-slate-900 text-white border border-slate-900'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={13} strokeWidth={2} className="shrink-0" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* SECCIÓN 1: REGLAS OFICIALES SEGÚN CORREO.TXT */}
      {activeSection === 'rules' && (
        <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2 gap-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-900">
                <Target size={14} strokeWidth={2} className="text-slate-400 shrink-0" />
                Campaña de incentivos por producción
              </h2>
              <span className="shrink-0 text-[9px] bg-slate-100 text-slate-600 font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
                24 - 31 Ago 2026
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-3">
              {/* Tarjeta BNB */}
              <div className="bg-bnb text-white rounded-xl p-3 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-black/15 px-2 py-0.5 rounded-md">
                    Proyecto BNB
                  </span>
                  <span className="text-xs font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
                    Premio: Bs. 150
                  </span>
                </div>
                <div className="text-base font-semibold">Meta: 60 cuentas</div>
                <p className="text-[10px] opacity-90">
                  Vale de consumo digital por alcanzar o superar las 60 cuentas no duplicadas en el periodo.
                </p>
              </div>

              {/* Tarjeta BILLE */}
              <div className="bg-bille text-white rounded-xl p-3 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-black/15 px-2 py-0.5 rounded-md">
                    Proyecto BILLE
                  </span>
                  <span className="text-xs font-semibold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md">
                    Premio: Bs. 150
                  </span>
                </div>
                <div className="text-base font-semibold">Meta: 70 cuentas</div>
                <p className="text-[10px] opacity-90">
                  Vale de consumo digital por alcanzar o superar las 70 cuentas no duplicadas en el periodo.
                </p>
              </div>

              {/* Tarjeta BONO DOBLE META */}
              <div className="bg-white border border-amber-200 rounded-xl p-3 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                    <Flame size={11} strokeWidth={2} className="shrink-0" />
                    Bono doble meta
                  </span>
                  <span className="text-xs font-semibold text-amber-700">
                    Premio total: Bs. 300
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  Cumplir BNB (60 cts) + Bille (70 cts)
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Si un afiliador cumple ambos objetivos cobrará un vale de consumo de Bs. 300.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-[10px] text-slate-600">
            <p className="flex items-center gap-1.5 font-semibold text-slate-700 uppercase tracking-wide">
              <Info size={12} strokeWidth={2} className="shrink-0" />
              Condiciones operativas:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 font-normal">
              <li>Para la determinación de beneficiarios se considerará la <strong className="font-semibold">producción no duplicada</strong>.</li>
              <li>El incentivo aplica de manera independiente para cada proyecto conforme al cumplimiento de las metas.</li>
            </ul>
          </div>

          {/* VISUALIZACIÓN DEL PREMIO */}
          <div className="rounded-xl p-4 bg-slate-900 text-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold tracking-wide uppercase text-white/60">
                Vale de consumo digital
              </span>
              <span className="bg-white/10 text-[9px] font-medium px-2 py-0.5 rounded-md border border-white/10">
                2026
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Award size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-semibold">Cierre de Agosto BEX 2026</p>
                <p className="text-[10px] text-white/60">Válido en establecimientos autorizados</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-[10px] font-medium text-white/60">Valor del incentivo</span>
              <span className="text-sm font-semibold tabular-nums">Bs. 150 / Bs. 300</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 text-center italic font-normal">
            Alcanza tu meta de cierre de mes y desbloquea tu orden de consumo automáticamente.
          </p>
        </div>
      )}

      {/* SECCIÓN 2: PODIO DE AFILIADORES */}
      {activeSection === 'podium' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-start gap-2.5">
              <div className="shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                <TrendingUp size={13} strokeWidth={2} className={brandText} />
              </div>
              <p className="text-xs font-medium text-slate-700 leading-normal">{bubbles.lider}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-start gap-2.5">
              <div className="shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                <Zap size={13} strokeWidth={2} className={brandText} />
              </div>
              <p className="text-xs font-medium text-slate-700 leading-normal">{bubbles.racha}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-start gap-2.5">
              <div className="shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                <MapPin size={13} strokeWidth={2} className="text-slate-500" />
              </div>
              <p className="text-xs font-medium text-slate-700 leading-normal">{bubbles.plaza}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200">
            <h2 className="text-[10px] font-semibold tracking-wide text-slate-400 text-center mb-3">
              Top 3 · Líderes proyecto {activeProject}
            </h2>
            <div className="flex justify-center items-end gap-2 max-w-xs mx-auto pt-2">
              <div className="flex flex-col items-center w-1/3 text-center">
                <div className="text-[8px] font-semibold truncate w-full text-slate-600">{t2.nombre.split(' ')[0]}</div>
                <div className="text-[9px] font-semibold text-slate-500 tabular-nums">{t2.cuentas} cts</div>
                <div className="w-full bg-slate-300 text-slate-700 font-semibold text-xs py-2 rounded-t-md mt-1">2°</div>
              </div>
              <div className="flex flex-col items-center w-1/3 text-center">
                <div className="text-[9px] font-semibold truncate w-full text-slate-800">{t1.nombre.split(' ')[0]}</div>
                <div className={`text-[10px] font-semibold tabular-nums ${brandText}`}>{t1.cuentas} cts</div>
                <div className={`w-full ${brandBg} text-white font-semibold text-sm py-4 rounded-t-md mt-1`}>1°</div>
              </div>
              <div className="flex flex-col items-center w-1/3 text-center">
                <div className="text-[8px] font-semibold truncate w-full text-slate-500">{t3.nombre.split(' ')[0]}</div>
                <div className="text-[9px] font-semibold text-slate-400 tabular-nums">{t3.cuentas} cts</div>
                <div className="w-full bg-slate-200 text-slate-600 font-semibold text-xs py-1.5 rounded-t-md mt-1">3°</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold text-slate-500 tracking-wide px-1">
              Ronda de competidores (4° al 10°)
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
                    <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md tabular-nums font-semibold">-{gap} cts</span>
                  ) : (
                    <span className={`${brandText} ${brandLight} border ${brandBorder} px-2 py-0.5 rounded-md font-semibold`}>Meta OK</span>
                  )

                  return (
                    <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-xs">
                      <div>
                        <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{index + 4}° lugar - {item.nombre}</span>
                          {item.isDoble && <span className="text-[8px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-1.5 py-0.5 rounded-md">Doble</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-0.5"><MapPin size={10} strokeWidth={2} className="shrink-0" />{item.ciudad}</span>
                          <span className="flex items-center gap-0.5"><Users size={10} strokeWidth={2} className="shrink-0" />{item.supervisor.split(' ')[0]}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold">
                        <div className="text-slate-900 tabular-nums">{item.cuentas} cts</div>
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

      {/* SECCIÓN 3: CALCULADORA DE BRECHAS Y FLYER DE RESULTADO */}
      {activeSection === 'calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-900">
              <Calculator size={13} strokeWidth={2} className="shrink-0 text-slate-400" />
              Calculadora de brechas y premios
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="sim-bnb" className="text-[10px] font-medium text-slate-500">
                  Cuentas BNB (Meta 60):
                </label>
                <input
                  id="sim-bnb"
                  type="number"
                  value={simBnb}
                  onChange={e => setSimBnb(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-base font-semibold text-center tabular-nums focus:outline-none focus:border-bnb focus:ring-2 focus:ring-bnb-light"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="sim-bille" className="text-[10px] font-medium text-slate-500">
                  Cuentas BILLE (Meta 70):
                </label>
                <input
                  id="sim-bille"
                  type="number"
                  value={simBille}
                  onChange={e => setSimBille(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-base font-semibold text-center tabular-nums focus:outline-none focus:border-bille focus:ring-2 focus:ring-bille-light"
                />
              </div>
            </div>

            <div className={`rounded-r-lg p-3 space-y-1 border-l-4 ${
              calcState.unlocked
                ? `${brandLight} ${activeProject === 'BNB' ? 'border-bnb' : 'border-bille'}`
                : 'bg-slate-50 border-slate-300'
            }`}>
              <div className={`flex items-center gap-1.5 ${calcState.statusClass}`}>
                {calcState.icon === 'doble' && <Flame size={13} strokeWidth={2} className="shrink-0" />}
                {calcState.icon === 'meta' && <CheckCircle2 size={13} strokeWidth={2} className="shrink-0" />}
                {calcState.statusText}
              </div>
              <div className="text-[11px] font-normal text-slate-600">{calcState.nextText}</div>
            </div>
          </div>

          {/* FLYER DE RESULTADO */}
          {calcState.unlocked && (
            <div className={`rounded-2xl p-5 shadow-sm text-white text-center space-y-4 relative overflow-hidden animate-flyer ${
              calcState.icon === 'doble'
                ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                : activeProject === 'BNB'
                  ? 'bg-gradient-to-br from-bnb to-bnb-dark'
                  : 'bg-gradient-to-br from-bille to-bille-dark'
            }`}>
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/8 rounded-full blur-2xl"></div>

              <div className="relative flex justify-center">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
                  {calcState.icon === 'doble'
                    ? <Trophy size={20} strokeWidth={2} />
                    : <Award size={20} strokeWidth={2} />}
                </div>
              </div>

              <div className="relative space-y-1">
                <h4 className="text-xl font-bold tracking-tight text-balance">
                  Felicitaciones
                </h4>
                <p className="text-[11px] font-medium tracking-wide uppercase text-white/70">
                  Meta superada exitosamente
                </p>
              </div>

              <div className="relative bg-slate-950/30 rounded-xl p-4 border border-white/15 space-y-2">
                <p className="text-[10px] font-medium tracking-wide text-white/60 uppercase">
                  Vale de consumo autorizado
                </p>
                <div className="text-3xl font-bold tabular-nums">{calcState.prizeVal}</div>
                <div className="text-[11px] font-medium text-white/60 border-t border-white/15 pt-2 flex justify-between items-center">
                  <span>Estado:</span>
                  <span className={calcState.badgeClass}>{calcState.levelBadge}</span>
                </div>
              </div>

              <p className="relative text-[10px] font-normal text-white/70 italic">
                Tu producción impulsa el cierre de mes. Sigue sumando con BEX.
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
              <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400 block">Total prod</span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5 tabular-nums">{kpis.totalCuentas}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400 block">Habilitados</span>
              <span className={`text-sm font-semibold block mt-0.5 tabular-nums ${brandText}`}>{kpis.habilitados}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400 block">Dobles</span>
              <span className="text-sm font-semibold text-amber-700 block mt-0.5 tabular-nums">{kpis.dobles}</span>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400 block">Red</span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5 tabular-nums">{kpis.staffCount}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                <MapPin size={11} strokeWidth={2} className="shrink-0" />
                Ciudad
              </div>
              <div className="flex flex-wrap gap-1">
                {distinctCities.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelCity(c)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-[background-color,color,border-color] cursor-pointer ${
                      selCity === c
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {c === 'ALL' ? 'Todas' : c}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                <Users size={11} strokeWidth={2} className="shrink-0" />
                Supervisor
              </div>
              <div className="flex flex-wrap gap-1">
                {distinctSups.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelSup(s)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-[background-color,color,border-color] cursor-pointer ${
                      selSup === s
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {s === 'ALL' ? 'Todos' : s.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar asesor..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 text-center text-slate-400 py-6 font-medium bg-white rounded-xl border border-slate-200">
                <AlertCircle size={18} strokeWidth={2} />
                Sin coincidencias.
              </div>
            ) : (
              filteredData.map((item, idx) => {
                const target = projectRule.target
                const barPct = Math.min((item.cuentas / target) * 100, 100).toFixed(0)
                let semColor = 'bg-red-400'
                if (item.cuentas >= target) semColor = activeProject === 'BNB' ? 'bg-bnb' : 'bg-bille'
                else if (item.cuentas >= target * 0.5) semColor = 'bg-amber-500'

                let badge = null
                if (item.isDoble) {
                  badge = (
                    <span className="flex items-center gap-1 text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                      <Flame size={10} strokeWidth={2} className="shrink-0" />
                      Doble meta (Bs. 300)
                    </span>
                  )
                } else if (item.isTargetMet) {
                  badge = (
                    <span className={`flex items-center gap-1 text-[9px] font-semibold ${brandLight} ${brandText} border ${brandBorder} px-2 py-0.5 rounded-md`}>
                      <CheckCircle2 size={10} strokeWidth={2} className="shrink-0" />
                      Meta cumplida (Bs. 150)
                    </span>
                  )
                } else {
                  badge = <span className="text-[9px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">En progreso</span>
                }

                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">{item.nombre}</h4>
                        <p className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                          <span className="flex items-center gap-0.5"><MapPin size={10} strokeWidth={2} className="shrink-0" />{item.ciudad.toUpperCase()}</span>
                          <span className="flex items-center gap-0.5"><Users size={10} strokeWidth={2} className="shrink-0" />{item.supervisor}</span>
                        </p>
                      </div>
                      {badge}
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-center shrink-0 min-w-[3rem]">
                        <span className="text-[8px] uppercase tracking-wide font-medium text-slate-400 block">{activeProject}</span>
                        <span className={`text-sm font-semibold block tabular-nums ${brandText}`}>{item.cuentas} cts</span>
                        <span className="text-[8px] text-slate-500 block tabular-nums">
                          {activeProject === 'BNB' ? `Bille: ${item.cuentas_bille}` : `BNB: ${item.cuentas_bnb}`}
                        </span>
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-[9px] font-medium text-slate-400 mb-1">
                          <span>Progreso {activeProject}</span>
                          <span className="tabular-nums">{item.cuentas}/{target} cts</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${semColor} rounded-full transition-[width]`} style={{ width: `${barPct}%` }}></div>
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
      <footer className="text-center text-[9px] font-medium text-slate-400 pt-2 tracking-wide">
        BEX &copy; 2026 - Campaña de Cierre de Mes (24 - 31 Ago)
      </footer>

    </div>
  )
}
