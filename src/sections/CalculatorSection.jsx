import React, { useMemo } from 'react'
import { Calculator, Flame, CheckCircle2, Trophy, Award } from 'lucide-react'
import { temaDe, evaluar, bs } from '../campaign'

const BADGE_VIDRIO = 'bg-white/15 text-white border border-white/20 px-2 py-0.5 rounded-md font-semibold text-[9px] uppercase tracking-wide'

/** Calculadora de brechas: un input por proyecto de la campaña, evaluado con
 *  las mismas reglas que aplica el backend a la producción real. */
export default function CalculatorSection({ campana, proyecto, tema, sim, onSimChange }) {
  const { proyectos, doble } = campana

  const calc = useMemo(() => {
    const cuentas = {}
    proyectos.forEach(p => { cuentas[p.key] = parseInt(sim[p.key], 10) || 0 })
    const { cumplidas, esDoble, premio } = evaluar(cuentas, campana)

    const cumplioActivo = cuentas[proyecto.key] >= proyecto.meta
    const faltantes = proyectos.filter(p => !cumplidas.includes(p))

    if (esDoble) {
      return {
        premio, esDoble, desbloqueado: true, icono: 'doble',
        titulo: `${doble?.titulo || 'Bono doble meta'} cumplido (${bs(premio)})`,
        tituloClase: 'text-xs font-semibold text-amber-700',
        detalle: `Cumpliste las metas de ${proyectos.map(p => `${p.etiqueta} (${p.meta} cts)`).join(' y ')}. Ganaste ${bs(premio)}.`,
        badge: 'Doble meta'
      }
    }
    if (cumplioActivo) {
      const pendiente = faltantes[0]
      return {
        premio, esDoble, desbloqueado: true, icono: 'meta',
        titulo: `Meta cumplida en ${proyecto.etiqueta} (${bs(proyecto.premio_bs)})`,
        tituloClase: `text-xs font-semibold ${tema.texto}`,
        detalle: pendiente && doble?.premio_bs
          ? `Faltan ${pendiente.meta - (cuentas[pendiente.key] || 0)} cuentas en ${pendiente.etiqueta} para activar el bono de ${bs(doble.premio_bs)}.`
          : 'Meta individual alcanzada.',
        badge: `Meta ${proyecto.etiqueta}`
      }
    }
    const brecha = proyecto.meta - cuentas[proyecto.key]
    return {
      premio, esDoble, desbloqueado: premio > 0, icono: premio > 0 ? 'meta' : 'none',
      titulo: `Sin meta alcanzada en ${proyecto.etiqueta}`,
      tituloClase: 'text-xs font-semibold text-red-500',
      detalle: `Faltan ${brecha} cuentas en ${proyecto.etiqueta} para alcanzar la meta de ${proyecto.meta} y obtener el vale de ${bs(proyecto.premio_bs)}.`,
      badge: 'En progreso'
    }
  }, [sim, campana, proyecto, tema, proyectos, doble])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-900">
          <Calculator size={13} strokeWidth={2} className="shrink-0 text-slate-400" />
          Calculadora de brechas y premios
        </h3>

        <div className={`grid gap-2 ${proyectos.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {proyectos.map(p => {
            const temaP = temaDe(p)
            return (
              <div key={p.key} className="space-y-1">
                <label htmlFor={`sim-${p.key}`} className="text-[10px] font-medium text-slate-500">
                  Cuentas {p.etiqueta} (Meta {p.meta}):
                </label>
                <input
                  id={`sim-${p.key}`}
                  type="number"
                  value={sim[p.key] ?? ''}
                  onChange={e => onSimChange(p.key, e.target.value)}
                  className={`w-full p-2 border border-slate-300 rounded-lg text-base font-semibold text-center tabular-nums focus:outline-none focus:ring-2 ${temaP.foco}`}
                />
              </div>
            )
          })}
        </div>

        <div className={`rounded-r-lg p-3 space-y-1 border-l-4 ${
          calc.desbloqueado ? `${tema.claro} ${tema.bordeSolido}` : 'bg-slate-50 border-slate-300'
        }`}>
          <div className={`flex items-center gap-1.5 ${calc.tituloClase}`}>
            {calc.icono === 'doble' && <Flame size={13} strokeWidth={2} className="shrink-0" />}
            {calc.icono === 'meta' && <CheckCircle2 size={13} strokeWidth={2} className="shrink-0" />}
            {calc.titulo}
          </div>
          <div className="text-[11px] font-normal text-slate-600">{calc.detalle}</div>
        </div>
      </div>

      {calc.desbloqueado && (
        <div className={`rounded-2xl p-5 shadow-sm text-white text-center space-y-4 relative overflow-hidden animate-flyer ${
          calc.esDoble ? 'bg-gradient-to-br from-amber-500 to-amber-600' : tema.flyer
        }`}>
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/8 rounded-full blur-2xl"></div>

          <div className="relative flex justify-center">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
              {calc.esDoble ? <Trophy size={20} strokeWidth={2} /> : <Award size={20} strokeWidth={2} />}
            </div>
          </div>

          <div className="relative space-y-1">
            <h4 className="text-xl font-bold tracking-tight text-balance">Felicitaciones</h4>
            <p className="text-[11px] font-medium tracking-wide uppercase text-white/70">
              Meta superada exitosamente
            </p>
          </div>

          <div className="relative bg-slate-950/30 rounded-xl p-4 border border-white/15 space-y-2">
            <p className="text-[10px] font-medium tracking-wide text-white/60 uppercase">
              Vale de consumo autorizado
            </p>
            <div className="text-3xl font-bold tabular-nums">{bs(calc.premio)}</div>
            <div className="text-[11px] font-medium text-white/60 border-t border-white/15 pt-2 flex justify-between items-center">
              <span>Estado:</span>
              <span className={BADGE_VIDRIO}>{calc.badge}</span>
            </div>
          </div>

          <p className="relative text-[10px] font-normal text-white/70 italic">
            Tu producción impulsa la campaña. Sigue sumando con BEX.
          </p>
        </div>
      )}
    </div>
  )
}
