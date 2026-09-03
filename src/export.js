// Reporte Excel para contabilidad: una fila por afiliador con su CI y el bono
// que le corresponde, mas la hoja de supervisores en las campanas que tienen
// ese incentivo. La libreria se carga con import() dinamico dentro de
// generarReporte, asi Vite la deja en su propio chunk y no pesa en la carga
// inicial de la pagina.

const CABECERA = { fontWeight: 'bold', backgroundColor: '#E2E8F0', align: 'center' }

const texto = (valor) => ({ type: String, value: valor || '' })
const numero = (valor) => ({ type: Number, value: Number(valor) || 0 })

/** Estado en personal. Un inactivo en el reporte produjo dentro de la campana:
 *  gano el bono aunque ya no este en la empresa, y contabilidad necesita saberlo
 *  antes de pagar. null = no se pudo determinar. */
const estado = (activo) => texto(activo === null || activo === undefined
  ? 'Sin dato'
  : (activo ? 'Activo' : 'Inactivo'))

/** Nombre de archivo estable y ordenable: incluye la campana y el dia de
 *  emision, porque el historico se recalcula en vivo y dos descargas de la
 *  misma campana en dias distintos pueden no coincidir. */
export function nombreArchivo(campana, hoy = new Date()) {
  const dia = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0')
  ].join('')
  return `incentivos_${campana.id}_${dia}.xlsx`
}

function hojaAfiliadores(campana, afiliadores) {
  const proyectos = campana.proyectos
  const etiquetaPorKey = Object.fromEntries(proyectos.map(p => [p.key, p.etiqueta]))

  const encabezado = [
    'CI', 'Nombre', 'Ciudad', 'Estado', 'Supervisor',
    ...proyectos.map(p => `Cuentas ${p.etiqueta}`),
    'Metas cumplidas', 'Premio Bs'
  ].map(t => ({ value: t, ...CABECERA }))

  const filas = afiliadores.map(a => ([
    texto(a.ci),
    texto(a.nombre),
    texto(a.ciudad),
    estado(a.activo),
    texto(a.supervisor),
    ...proyectos.map(p => numero(a.cuentas?.[p.key])),
    texto(a.metas_cumplidas.map(k => etiquetaPorKey[k] || k).join(' + ')),
    numero(a.premio_bs)
  ]))

  return {
    nombre: 'Afiliadores',
    datos: [encabezado, ...filas],
    anchos: [14, 38, 16, 11, 34, ...proyectos.map(() => 14), 20, 12]
  }
}

function hojaSupervisores(campana, supervisores) {
  const bsPorAfiliador = campana.supervisor.bs_por_afiliador

  const encabezado = [
    'CI', 'Supervisor', 'Ciudad', 'Estado',
    'Afiliadores en equipo', 'Con bono', 'Bs por afiliador', 'Premio Bs'
  ].map(t => ({ value: t, ...CABECERA }))

  const filas = supervisores.map(s => ([
    texto(s.ci),
    texto(s.supervisor),
    texto(s.ciudad),
    estado(s.activo),
    numero(s.afiliadores_total),
    numero(s.afiliadores_con_bono),
    numero(bsPorAfiliador),
    numero(s.premio_bs)
  ]))

  return {
    nombre: 'Supervisores',
    datos: [encabezado, ...filas],
    anchos: [14, 34, 16, 11, 22, 12, 18, 12]
  }
}

/** Hojas del reporte, separadas de la descarga para poder verificarlas fuera
 *  del navegador. La de supervisores solo existe si la campana tiene el
 *  incentivo y hay equipos. */
export function construirHojas({ campana, afiliadores, supervisores }) {
  const hojas = [hojaAfiliadores(campana, afiliadores)]
  if (campana.supervisor && supervisores?.length) {
    hojas.push(hojaSupervisores(campana, supervisores))
  }
  return hojas
}

/** Arma y descarga el reporte de la campana completa, sin aplicar los filtros
 *  de pantalla: contabilidad debe recibir siempre el mismo universo. */
export async function generarReporte({ campana, afiliadores, supervisores }) {
  // El paquete no expone raiz: hay que pedir el subpath de navegador.
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const hojas = construirHojas({ campana, afiliadores, supervisores })

  // Multi-hoja: un objeto por hoja, con sus propias columnas y encabezado fijo.
  // La descarga se dispara con .toFile(); la libreria no acepta el nombre como
  // opcion, hay que encadenarlo.
  await writeXlsxFile(hojas.map(h => ({
    data: h.datos,
    sheet: h.nombre,
    columns: h.anchos.map(width => ({ width })),
    stickyRowsCount: 1
  }))).toFile(nombreArchivo(campana))
}
