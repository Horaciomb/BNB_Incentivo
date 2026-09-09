import React from 'react'
import { AlertCircle, Loader2, FlaskConical, UserX } from 'lucide-react'

export function CargandoPanel({ texto = 'Cargando campaña...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400 bg-white rounded-xl border border-slate-200">
      <Loader2 size={20} strokeWidth={2} className="animate-spin" />
      <span className="text-xs font-medium">{texto}</span>
    </div>
  )
}

export function ErrorPanel({ mensaje, onReintentar }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center bg-white rounded-xl border border-red-200">
      <AlertCircle size={20} strokeWidth={2} className="text-red-500" />
      <p className="text-xs font-semibold text-slate-800">No se pudo cargar la información</p>
      <p className="text-[10px] text-slate-500 font-normal break-all">{mensaje}</p>
      <button
        onClick={onReintentar}
        className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold cursor-pointer hover:bg-slate-800"
      >
        Reintentar
      </button>
    </div>
  )
}

/** El backend sirve un roster de demostración cuando no llega a PostgreSQL.
 *  Se avisa explícitamente: números falsos sin aviso son peores que un error. */
export function RespaldoBanner() {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
      <FlaskConical size={14} strokeWidth={2} className="shrink-0 mt-0.5 text-amber-700" />
      <p className="text-[10px] font-medium text-amber-900 leading-normal">
        <strong className="font-semibold">Datos de demostración.</strong>{' '}
        No hay conexión con la base de datos, las cifras mostradas no son producción real.
      </p>
    </div>
  )
}

/** Producción de celulares que no están en la planilla de Personal: esa gente
 *  afilió pero no aparece en el tablero, así que su bono no se le paga a nadie.
 *  Antes de este aviso el caso era invisible — se perdieron dos bonos así. */
export function SinRosterBanner({ sinRoster, meta }) {
  if (!sinRoster?.length) return null

  const totales = sinRoster.map(x => Math.max(...Object.values(x.cuentas)))
  const afiliaciones = sinRoster.reduce(
    (s, x) => s + Object.values(x.cuentas).reduce((a, b) => a + b, 0), 0,
  )
  // Solo se llama "posible bono" a quien llega a la meta del proyecto visible;
  // el resto es producción huérfana, molesta pero sin plata en juego.
  const conMeta = meta ? totales.filter(n => n >= meta).length : 0

  return (
    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
      <UserX size={14} strokeWidth={2} className="shrink-0 mt-0.5 text-orange-700" />
      <p className="text-[10px] font-medium text-orange-900 leading-normal">
        <strong className="font-semibold">
          {sinRoster.length} {sinRoster.length === 1 ? 'celular afilió' : 'celulares afiliaron'} sin estar en la planilla
        </strong>{' '}
        ({afiliaciones} {afiliaciones === 1 ? 'afiliación' : 'afiliaciones'} que no se ven en el tablero).
        {conMeta > 0 && (
          <>
            {' '}
            <strong className="font-semibold">{conMeta} {conMeta === 1 ? 'llegaría' : 'llegarían'} a la meta</strong>
            {' '}— hay bono sin pagar.
          </>
        )}{' '}
        Cargar a esa gente en la planilla de Personal para que entre al cálculo:{' '}
        <span className="font-mono">{sinRoster.slice(0, 6).map(x => x.celular).join(', ')}</span>
        {sinRoster.length > 6 && ` y ${sinRoster.length - 6} más`}.
      </p>
    </div>
  )
}
