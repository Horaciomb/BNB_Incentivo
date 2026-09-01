import React from 'react'
import { temaDe } from '../campaign'

/** Pestañas de proyecto generadas desde la campaña: su cantidad, su orden y su
 *  etiqueta visible (una misma base puede mostrarse como "BNB" o como "QR"). */
export default function ProjectTabs({ proyectos, activo, onChange }) {
  if (proyectos.length === 0) return null

  return (
    <div className={`grid gap-2 ${proyectos.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {proyectos.map(p => {
        const tema = temaDe(p)
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            aria-pressed={activo === p.key}
            className={`py-3 px-2 rounded-lg font-semibold text-xs text-center cursor-pointer transition-[background-color,box-shadow,transform] active:scale-[0.96] ${
              activo === p.key ? tema.tabActiva : tema.tabInactiva
            }`}
          >
            {p.etiqueta} · Meta {p.meta}
          </button>
        )
      })}
    </div>
  )
}
