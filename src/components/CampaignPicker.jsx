import React from 'react'
import { CalendarDays } from 'lucide-react'

const ETIQUETA_GRUPO = {
  activa: 'Vigentes',
  futura: 'Próximas',
  pasada: 'Anteriores'
}

/** Selector de campaña. Agrupa por estado para que una campaña terminada no se
 *  confunda nunca con la que está corriendo. */
export default function CampaignPicker({ campanas, campanaId, onChange }) {
  const grupos = ['activa', 'futura', 'pasada']
    .map(estado => [estado, campanas.filter(c => c.estado === estado)])
    .filter(([, lista]) => lista.length > 0)

  return (
    <div className="relative">
      <CalendarDays
        size={14}
        strokeWidth={2}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <select
        aria-label="Campaña"
        value={campanaId || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
      >
        {grupos.map(([estado, lista]) => (
          <optgroup key={estado} label={ETIQUETA_GRUPO[estado]}>
            {lista.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {c.periodo_texto}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">
        ▼
      </span>
    </div>
  )
}
