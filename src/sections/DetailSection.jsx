import React from 'react'
import { MapPin, Users, Search, AlertCircle, Flame, CheckCircle2 } from 'lucide-react'
import { bs } from '../campaign'

/** KPIs, filtros y detalle por afiliador del proyecto activo. */
export default function DetailSection({
  campana, proyecto, tema, filas, kpis,
  ciudades, supervisores, selCity, selSup, searchTerm,
  onCity, onSup, onSearch
}) {
  const otros = campana.proyectos.filter(p => p.key !== proyecto.key)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1">
        {[
          { label: 'Total prod', valor: kpis.totalCuentas, clase: 'text-slate-900' },
          { label: 'Habilitados', valor: kpis.habilitados, clase: tema.texto },
          { label: 'Dobles', valor: kpis.dobles, clase: 'text-amber-700' },
          { label: 'Red', valor: kpis.staffCount, clase: 'text-slate-900' }
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400 block">{k.label}</span>
            <span className={`text-sm font-semibold block mt-0.5 tabular-nums ${k.clase}`}>{k.valor}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            <MapPin size={11} strokeWidth={2} className="shrink-0" />
            Ciudad
          </div>
          <div className="flex flex-wrap gap-1">
            {ciudades.map(c => (
              <button
                key={c}
                onClick={() => onCity(c)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-[background-color,color,border-color] cursor-pointer ${
                  selCity === c
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
            {supervisores.map(s => (
              <button
                key={s}
                onClick={() => onSup(s)}
                title={s === 'ALL' ? 'Todos' : s}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-[background-color,color,border-color] cursor-pointer ${
                  selSup === s
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s === 'ALL' ? 'Todos' : s.split(' ').slice(0, 2).join(' ')}
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
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar asesor..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
        />
      </div>

      <div className="space-y-2">
        {filas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 text-center text-slate-400 py-6 font-medium bg-white rounded-xl border border-slate-200">
            <AlertCircle size={18} strokeWidth={2} />
            Sin coincidencias.
          </div>
        ) : (
          filas.map((item, idx) => {
            const barPct = Math.min((item.cuentasProj / proyecto.meta) * 100, 100).toFixed(0)
            const cumplioActivo = item.metas_cumplidas.includes(proyecto.key)

            let semColor = 'bg-red-400'
            if (cumplioActivo) semColor = tema.barra
            else if (item.cuentasProj >= proyecto.meta * 0.5) semColor = 'bg-amber-500'

            let badge
            if (item.es_doble) {
              badge = (
                <span className="flex items-center gap-1 text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                  <Flame size={10} strokeWidth={2} className="shrink-0" />
                  Doble meta ({bs(item.premio_bs)})
                </span>
              )
            } else if (cumplioActivo) {
              badge = (
                <span className={`flex items-center gap-1 text-[9px] font-semibold ${tema.claro} ${tema.texto} border ${tema.borde} px-2 py-0.5 rounded-md`}>
                  <CheckCircle2 size={10} strokeWidth={2} className="shrink-0" />
                  Meta cumplida ({bs(proyecto.premio_bs)})
                </span>
              )
            } else {
              badge = <span className="text-[9px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">En progreso</span>
            }

            return (
              <div key={item.nombre + idx} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{item.nombre}</h4>
                    <p className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                      <span className="flex items-center gap-0.5"><MapPin size={10} strokeWidth={2} className="shrink-0" />{item.ciudad.toUpperCase()}</span>
                      {/* Un inactivo aca produjo dentro de la campana: cobra el
                          bono aunque ya no este en la empresa. */}
                      {item.activo === false && (
                        <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-md">
                          Inactivo
                        </span>
                      )}
                      <span className="flex items-center gap-0.5"><Users size={10} strokeWidth={2} className="shrink-0" />{item.supervisor}</span>
                    </p>
                  </div>
                  {badge}
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-center shrink-0 min-w-[3rem]">
                    <span className="text-[8px] uppercase tracking-wide font-medium text-slate-400 block">{proyecto.etiqueta}</span>
                    <span className={`text-sm font-semibold block tabular-nums ${tema.texto}`}>{item.cuentasProj} cts</span>
                    {otros.map(p => (
                      <span key={p.key} className="text-[8px] text-slate-500 block tabular-nums">
                        {p.etiqueta}: {item.cuentas[p.key] ?? 0}
                      </span>
                    ))}
                  </div>
                  <div className="w-full">
                    <div className="flex justify-between text-[9px] font-medium text-slate-400 mb-1">
                      <span>Progreso {proyecto.etiqueta}</span>
                      <span className="tabular-nums">{item.cuentasProj}/{proyecto.meta} cts</span>
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
  )
}
