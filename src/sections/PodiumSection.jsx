import React, { useMemo } from 'react'
import { MapPin, Users, TrendingUp, Zap } from 'lucide-react'

const VACIO = { nombre: '-', ciudad: '-', cuentasProj: 0 }

/** Podio y ronda de competidores del proyecto activo. `filas` ya viene
 *  filtrada y ordenada por App. */
export default function PodiumSection({ filas, proyecto, tema }) {
  const bubbles = useMemo(() => {
    if (filas.length === 0) {
      return {
        lider: 'Sin registros comerciales en esta zona.',
        racha: 'Ninguna racha activa actualmente.',
        plaza: 'No se detecta plaza dominante.'
      }
    }
    const t1 = filas[0]
    const t2 = filas[1]

    let racha = 'Liderazgo Firme: El primer lugar mantiene ventaja frente a la competencia.'
    if (t2 && (t1.cuentasProj - t2.cuentasProj <= 1)) {
      racha = `Competencia al Límite: ${t2.nombre} se encuentra a solo 1 cuenta de distancia del 1° lugar.`
    }

    const ciudadesTop = filas.slice(0, 3).map(x => x.ciudad)
    const ciudadFrecuente = [...ciudadesTop]
      .sort((a, b) => ciudadesTop.filter(v => v === a).length - ciudadesTop.filter(v => v === b).length)
      .pop() || 'N/A'

    return {
      lider: `Avance Destacado: El afiliador ${t1.nombre} lidera la tabla con ${t1.cuentasProj} cuentas en ${proyecto.etiqueta}.`,
      racha,
      plaza: `Sucursal Dominante: ${ciudadFrecuente.toUpperCase()} cuenta con mayor concentración en el Top 3.`
    }
  }, [filas, proyecto])

  const t1 = filas[0] || VACIO
  const t2 = filas[1] || VACIO
  const t3 = filas[2] || VACIO
  const runners = filas.slice(3, 10)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {[
          { texto: bubbles.lider, Icon: TrendingUp, color: tema.texto },
          { texto: bubbles.racha, Icon: Zap, color: tema.texto },
          { texto: bubbles.plaza, Icon: MapPin, color: 'text-slate-500' }
        ].map(({ texto, Icon, color }, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-start gap-2.5">
            <div className="shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
              <Icon size={13} strokeWidth={2} className={color} />
            </div>
            <p className="text-xs font-medium text-slate-700 leading-normal">{texto}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200">
        <h2 className="text-[10px] font-semibold tracking-wide text-slate-400 text-center mb-3">
          Top 3 · Líderes proyecto {proyecto.etiqueta}
        </h2>
        <div className="flex justify-center items-end gap-2 max-w-xs mx-auto pt-2">
          <div className="flex flex-col items-center w-1/3 text-center">
            <div className="text-[8px] font-semibold truncate w-full text-slate-600">{t2.nombre.split(' ')[0]}</div>
            <div className="text-[9px] font-semibold text-slate-500 tabular-nums">{t2.cuentasProj} cts</div>
            <div className="w-full bg-slate-300 text-slate-700 font-semibold text-xs py-2 rounded-t-md mt-1">2°</div>
          </div>
          <div className="flex flex-col items-center w-1/3 text-center">
            <div className="text-[9px] font-semibold truncate w-full text-slate-800">{t1.nombre.split(' ')[0]}</div>
            <div className={`text-[10px] font-semibold tabular-nums ${tema.texto}`}>{t1.cuentasProj} cts</div>
            <div className={`w-full ${tema.fondo} text-white font-semibold text-sm py-4 rounded-t-md mt-1`}>1°</div>
          </div>
          <div className="flex flex-col items-center w-1/3 text-center">
            <div className="text-[8px] font-semibold truncate w-full text-slate-500">{t3.nombre.split(' ')[0]}</div>
            <div className="text-[9px] font-semibold text-slate-400 tabular-nums">{t3.cuentasProj} cts</div>
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
              const gap = Math.max(proyecto.meta - item.cuentasProj, 0)
              return (
                <div key={item.nombre + index} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-xs">
                  <div>
                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>{index + 4}° lugar - {item.nombre}</span>
                      {item.es_doble && <span className="text-[8px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-1.5 py-0.5 rounded-md">Doble</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-0.5"><MapPin size={10} strokeWidth={2} className="shrink-0" />{item.ciudad}</span>
                      <span className="flex items-center gap-0.5"><Users size={10} strokeWidth={2} className="shrink-0" />{item.supervisor.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs font-semibold">
                    <div className="text-slate-900 tabular-nums">{item.cuentasProj} cts</div>
                    <div className="text-[9px] mt-1">
                      {gap > 0 ? (
                        <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md tabular-nums font-semibold">-{gap} cts</span>
                      ) : (
                        <span className={`${tema.texto} ${tema.claro} border ${tema.borde} px-2 py-0.5 rounded-md font-semibold`}>Meta OK</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
