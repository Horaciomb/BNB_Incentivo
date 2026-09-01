import React from 'react'
import { Users, MapPin, AlertCircle, Info } from 'lucide-react'
import { bs } from '../campaign'

/** Incentivo de supervisores: Bs X por cada afiliador del equipo que cobre
 *  algún bono. Sólo se monta en campañas que lo definen. */
export default function SupervisorsSection({ campana, supervisores }) {
  const regla = campana.supervisor
  const totalPagar = supervisores.reduce((s, x) => s + x.premio_bs, 0)
  const conBono = supervisores.filter(s => s.premio_bs > 0).length

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-xl p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide">
            <Users size={14} strokeWidth={2} className="shrink-0 text-amber-400" />
            {regla.titulo || 'Incentivo supervisores'}
          </h2>
          <span className="shrink-0 text-xs font-semibold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
            {bs(regla.bs_por_afiliador)} c/u
          </span>
        </div>
        <p className="text-[10px] text-white/70 font-normal">{regla.descripcion}</p>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {[
          { label: 'Supervisores', valor: supervisores.length },
          { label: 'Con bono', valor: conBono },
          { label: 'Total a pagar', valor: bs(totalPagar) }
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400 block">{k.label}</span>
            <span className="text-sm font-semibold text-slate-900 block mt-0.5 tabular-nums">{k.valor}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {supervisores.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 text-center text-slate-400 py-6 font-medium bg-white rounded-xl border border-slate-200">
            <AlertCircle size={18} strokeWidth={2} />
            Sin equipos registrados.
          </div>
        ) : (
          supervisores.map(s => {
            const pct = s.afiliadores_total > 0
              ? Math.round((s.afiliadores_con_bono / s.afiliadores_total) * 100)
              : 0
            return (
              <div key={s.supervisor} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{s.supervisor}</h4>
                    <p className="flex items-center gap-0.5 text-[10px] text-slate-400 font-medium mt-0.5">
                      <MapPin size={10} strokeWidth={2} className="shrink-0" />
                      {s.ciudad.toUpperCase()}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md tabular-nums ${
                    s.premio_bs > 0
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}>
                    {bs(s.premio_bs)}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex justify-between text-[9px] font-medium text-slate-400">
                    <span>Afiliadores que cobran bono</span>
                    <span className="tabular-nums">{s.afiliadores_con_bono}/{s.afiliadores_total}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] ${s.premio_bs > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] text-slate-500 font-normal tabular-nums">
                    {s.afiliadores_con_bono} × {bs(regla.bs_por_afiliador)} = {bs(s.premio_bs)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="flex items-start gap-1.5 text-[10px] text-slate-500 font-normal px-1">
        <Info size={12} strokeWidth={2} className="shrink-0 mt-0.5" />
        Se cuenta una vez por afiliador que cobre al menos un bono, sin importar cuántas metas haya cumplido.
      </p>
    </div>
  )
}
