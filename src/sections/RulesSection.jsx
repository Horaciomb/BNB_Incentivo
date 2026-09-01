import React from 'react'
import { Target, Flame, Info, Award, Users } from 'lucide-react'
import { temaDe, bs } from '../campaign'

/** Reglas oficiales de la campaña, armadas enteramente desde campanas.json:
 *  una tarjeta por proyecto, el bono doble meta y, si existe, el incentivo de
 *  supervisores. */
export default function RulesSection({ campana }) {
  const { proyectos, doble, supervisor } = campana
  const premios = [...new Set(proyectos.map(p => p.premio_bs))].sort((a, b) => a - b)
  const rangoPremio = doble?.premio_bs
    ? `${premios.map(bs).join(' / ')} / ${bs(doble.premio_bs)}`
    : premios.map(bs).join(' / ')
  const anio = campana.hasta.slice(0, 4)

  return (
    <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2 gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-900">
            <Target size={14} strokeWidth={2} className="text-slate-400 shrink-0" />
            {campana.subtitulo || campana.nombre}
          </h2>
          <span className="shrink-0 text-[9px] bg-slate-100 text-slate-600 font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
            {campana.periodo_texto}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 mt-3">
          {proyectos.map(p => {
            const tema = temaDe(p)
            return (
              <div key={p.key} className={`${tema.tarjeta} text-white rounded-xl p-3 shadow-xs space-y-1`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-black/15 px-2 py-0.5 rounded-md">
                    Proyecto {p.etiqueta}
                  </span>
                  <span className="text-xs font-semibold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                    Premio: {bs(p.premio_bs)}
                  </span>
                </div>
                <div className="text-base font-semibold">Meta: {p.meta} cuentas</div>
                <p className="text-[10px] opacity-90">
                  Vale de consumo digital por alcanzar o superar las {p.meta} cuentas no duplicadas en el periodo.
                </p>
              </div>
            )
          })}

          {doble?.premio_bs && proyectos.length > 1 && (
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-xl p-3 shadow-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-slate-950 text-amber-400 border border-slate-950 px-2 py-0.5 rounded-md">
                  <Flame size={11} strokeWidth={2} className="shrink-0" />
                  {doble.titulo || 'Bono doble meta'}
                </span>
                <span className="text-xs font-semibold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                  Premio total: {bs(doble.premio_bs)}
                </span>
              </div>
              <div className="text-sm font-semibold text-white">
                Cumplir {proyectos.map(p => `${p.etiqueta} (${p.meta} cts)`).join(' + ')}
              </div>
              <p className="text-[10px] text-white/85 font-normal">
                Si un afiliador cumple todos los objetivos cobrará un vale de consumo de {bs(doble.premio_bs)}.
              </p>
            </div>
          )}

          {supervisor && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-xl p-3 shadow-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded-md">
                  <Users size={11} strokeWidth={2} className="shrink-0" />
                  {supervisor.titulo || 'Incentivo supervisores'}
                </span>
                <span className="text-xs font-semibold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                  {bs(supervisor.bs_por_afiliador)} c/u
                </span>
              </div>
              <div className="text-sm font-semibold text-white">
                Por cada afiliador de tu equipo que cobre bono
              </div>
              <p className="text-[10px] text-white/70 font-normal">
                {supervisor.descripcion}
              </p>
            </div>
          )}
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

      <div className="rounded-xl p-4 bg-slate-900 text-white space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold tracking-wide uppercase text-amber-400">
            Vale de consumo digital
          </span>
          <span className="bg-white/10 text-[9px] font-medium px-2 py-0.5 rounded-md border border-white/10">
            {anio}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Award size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold">{campana.nombre} BEX {anio}</p>
            <p className="text-[10px] text-white/60">Válido en establecimientos autorizados</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-2">
          <span className="text-[10px] font-medium text-white/60">Valor del incentivo</span>
          <span className="text-sm font-semibold tabular-nums bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
            {rangoPremio}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 text-center italic font-normal">
        Alcanza tu meta y desbloquea tu orden de consumo automáticamente.
      </p>
    </div>
  )
}
