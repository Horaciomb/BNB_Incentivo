// Temas visuales por proyecto. Tailwind no ve clases construidas en runtime
// (`bg-${x}` se purga), así que cada clase se escribe completa aquí y se
// selecciona por el campo "tema" que trae cada proyecto en campanas.json.
export const TEMAS = {
  bnb: {
    fondo: 'bg-bnb',
    texto: 'text-bnb-dark',
    claro: 'bg-bnb-light',
    borde: 'border-bnb/30',
    bordeSolido: 'border-bnb',
    barra: 'bg-bnb',
    tabActiva: 'bg-gradient-to-br from-bnb-dark to-bnb text-white shadow-sm',
    tabInactiva: 'bg-white border border-slate-200 text-bnb-dark hover:bg-slate-50',
    tarjeta: 'bg-gradient-to-br from-bnb-dark to-bnb',
    flyer: 'bg-gradient-to-br from-bnb to-bnb-dark',
    foco: 'focus:border-bnb focus:ring-bnb-light'
  },
  bille: {
    fondo: 'bg-bille',
    texto: 'text-bille-dark',
    claro: 'bg-bille-light',
    borde: 'border-bille/30',
    bordeSolido: 'border-bille',
    barra: 'bg-bille',
    tabActiva: 'bg-gradient-to-br from-bille to-indigo-500 text-white shadow-sm',
    tabInactiva: 'bg-white border border-slate-200 text-bille-dark hover:bg-slate-50',
    tarjeta: 'bg-gradient-to-br from-bille to-indigo-500',
    flyer: 'bg-gradient-to-br from-bille to-bille-dark',
    foco: 'focus:border-bille focus:ring-bille-light'
  }
}

const TEMA_NEUTRO = TEMAS.bnb

export const temaDe = (proyecto) => TEMAS[proyecto?.tema] || TEMA_NEUTRO

export const bs = (monto) => `Bs. ${monto}`

export const buscarProyecto = (campana, key) =>
  (campana?.proyectos || []).find(p => p.key === key) || null

/** Metas cumplidas y premio para un juego de cuentas, con las reglas de la
 *  campaña. Misma lógica que _evaluar_afiliador en server.py — el backend la
 *  aplica a la producción real, aquí sirve para la calculadora simulada. */
export function evaluar(cuentas, campana) {
  const proyectos = campana?.proyectos || []
  const cumplidas = proyectos.filter(p => (cuentas[p.key] || 0) >= p.meta)
  const esDoble = proyectos.length > 1 && cumplidas.length === proyectos.length
  const premioDoble = campana?.doble?.premio_bs

  const premio = esDoble && premioDoble
    ? premioDoble
    : cumplidas.reduce((suma, p) => suma + p.premio_bs, 0)

  return { cumplidas, esDoble, premio }
}
