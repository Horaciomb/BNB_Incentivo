// Verifica el reporte Excel sin abrir el navegador, que es para lo que
// export.js separa construirHojas() de generarReporte(). Se apoya en la API de
// verdad, asi que comprueba tambien que las columnas por proyecto salgan con la
// etiqueta visible de cada campana y no con la clave interna.
//
//   node scripts/verificar_reporte.mjs
//   node scripts/verificar_reporte.mjs --api http://localhost:8000/api
//   node scripts/verificar_reporte.mjs --guardar .
//
// Correrlo al añadir una campana a campanas.json: es cuando el reporte se
// rompe, porque las columnas de cuentas salen de proyectos[].etiqueta.

import { mkdtemp, rm, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import writeXlsxFile from 'write-excel-file/node'
import { construirHojas, nombreArchivo } from '../src/export.js'

const API_POR_DEFECTO = 'https://srv.beneficioslatam.com/convocatoria/bnb/api'
const ESTADOS = new Set(['Activo', 'Inactivo', 'Sin dato'])

function opcion(nombre) {
  const i = process.argv.indexOf(`--${nombre}`)
  return i > -1 ? process.argv[i + 1] : null
}

const api = (opcion('api') || API_POR_DEFECTO).replace(/\/$/, '')
const guardarEn = opcion('guardar')

let fallos = 0
const check = (ok, msg) => {
  console.log(`  ${ok ? 'OK   ' : 'FALLO'} ${msg}`)
  if (!ok) fallos++
}

/** La API caida, inalcanzable o mal apuntada no es un fallo del reporte. Lanza
 *  un Error normal en vez de llamar a process.exit(): salir con sockets a medio
 *  cerrar hace que Node aborte en Windows con un assert de libuv y devuelva 127
 *  en vez de 1. Lo recoge el catch del final. */
async function pedir(ruta) {
  let res
  try {
    res = await fetch(`${api}${ruta}`)
  } catch (e) {
    throw new Error(`no se pudo llamar a ${api}${ruta} — ${e.message}`)
  }
  if (!res.ok) throw new Error(`${api}${ruta} respondio HTTP ${res.status}`)

  const texto = await res.text()
  try {
    return JSON.parse(texto)
  } catch {
    // Caddy hace try_files {path} /index.html: una ruta mal escrita bajo el
    // prefijo de la app devuelve 200 con el HTML del panel, no un 404.
    throw new Error(`${api}${ruta} no devolvio JSON. Revisa la ruta de la API.`)
  }
}

/** Comprueba una hoja: forma de la tabla y la columna Estado, que es la que
 *  mira contabilidad antes de emitir el vale. */
function revisarHoja(hoja, filasEsperadas) {
  const [cabecera, ...filas] = hoja.datos
  const titulos = cabecera.map(c => c.value)

  check(filas.length === filasEsperadas, `${hoja.nombre}: ${filas.length} filas de datos`)
  check(cabecera.length === hoja.anchos.length, `${hoja.nombre}: ${cabecera.length} columnas con ${hoja.anchos.length} anchos`)
  check(filas.every(f => f.length === cabecera.length), `${hoja.nombre}: toda fila tiene ${cabecera.length} celdas`)

  const iCiudad = titulos.indexOf('Ciudad')
  const iEstado = titulos.indexOf('Estado')
  check(iEstado === iCiudad + 1, `${hoja.nombre}: "Estado" va justo despues de "Ciudad" (${iCiudad} -> ${iEstado})`)

  const valores = filas.map(f => f[iEstado].value)
  check(valores.every(v => ESTADOS.has(v)), `${hoja.nombre}: Estado solo toma valores del catalogo`)

  const conteo = valores.reduce((a, v) => ({ ...a, [v]: (a[v] || 0) + 1 }), {})
  console.log(`        estados: ${JSON.stringify(conteo)}`)
  return { titulos, filas, conteo }
}

const suma = (filas, i) => filas.reduce((s, f) => s + f[i].value, 0)

async function main() {
  const salida = guardarEn || await mkdtemp(join(tmpdir(), 'reporte-'))
  const { campanas } = await pedir('/campanas')
  console.log(`API: ${api}\n${campanas.length} campanas visibles`)

  for (const meta of campanas) {
    const datos = await pedir(`/incentivos/${meta.id}`)
    const { campana, afiliadores, supervisores } = datos
    console.log(`\n=== ${campana.nombre} (${campana.id}) ===`)
    check(!datos.es_respaldo, `datos reales, no el roster de respaldo (es_respaldo=${datos.es_respaldo})`)

    const hojas = construirHojas(datos)
    const nombres = hojas.map(h => h.nombre)
    check(
      campana.supervisor ? nombres.includes('Supervisores') : !nombres.includes('Supervisores'),
      `hojas [${nombres}] para una campana ${campana.supervisor ? 'con' : 'sin'} incentivo de supervisores`
    )

    const afil = revisarHoja(hojas[0], afiliadores.length)
    check(
      (afil.conteo['Inactivo'] || 0) === afiliadores.filter(a => a.activo === false).length,
      `Afiliadores: los inactivos del xlsx coinciden con los de la API`
    )
    check(
      suma(afil.filas, afil.titulos.indexOf('Premio Bs')) === afiliadores.reduce((s, a) => s + a.premio_bs, 0),
      `Afiliadores: premio total Bs. ${suma(afil.filas, afil.titulos.indexOf('Premio Bs'))}`
    )
    for (const p of campana.proyectos) {
      const i = afil.titulos.indexOf(`Cuentas ${p.etiqueta}`)
      check(i > -1, `Afiliadores: columna "Cuentas ${p.etiqueta}" (etiqueta visible de la clave ${p.key})`)
      if (i > -1) {
        const enApi = afiliadores.reduce((s, a) => s + (a.cuentas?.[p.key] || 0), 0)
        check(suma(afil.filas, i) === enApi, `Afiliadores: cuentas ${p.etiqueta} suman ${enApi}`)
      }
    }

    if (hojas[1]) {
      const sup = revisarHoja(hojas[1], supervisores.length)
      const iPremio = sup.titulos.indexOf('Premio Bs')
      check(
        suma(sup.filas, iPremio) === supervisores.reduce((s, x) => s + x.premio_bs, 0),
        `Supervisores: premio total Bs. ${suma(sup.filas, iPremio)}`
      )
      const iPorAfiliador = sup.titulos.indexOf('Bs por afiliador')
      const iConBono = sup.titulos.indexOf('Con bono')
      check(
        sup.filas.every(f => f[iPremio].value === f[iConBono].value * f[iPorAfiliador].value),
        `Supervisores: cada premio es "con bono" x "Bs por afiliador"`
      )
    }

    // v4 encadena toFile(); es el mismo camino que generarReporte() en el navegador.
    const ruta = join(salida, nombreArchivo(campana))
    await writeXlsxFile(hojas.map(h => ({
      data: h.datos,
      sheet: h.nombre,
      columns: h.anchos.map(width => ({ width })),
      stickyRowsCount: 1
    }))).toFile(ruta)

    const { size } = await stat(ruta)
    const bytes = await readFile(ruta)
    // PK\x03\x04: cabecera local de zip. El xlsx es un zip, y los nombres de las
    // partes viajan sin comprimir, asi que se pueden contar leyendo el buffer.
    check(bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), `${nombreArchivo(campana)}: zip valido (${size} bytes)`)
    const partes = [...bytes.toString('latin1').matchAll(/xl\/worksheets\/sheet\d+\.xml/g)]
    const distintas = new Set(partes.map(m => m[0])).size
    check(distintas === hojas.length, `${nombreArchivo(campana)}: ${distintas} hoja(s) dentro del archivo`)
  }

  if (!guardarEn) await rm(salida, { recursive: true, force: true })
  else console.log(`\nArchivos en ${salida}`)

  console.log(fallos === 0 ? '\nTodo OK.' : `\n${fallos} comprobaciones fallidas.`)
  process.exitCode = fallos === 0 ? 0 : 1
}

main().catch((e) => {
  console.error('')
  console.error(`Error: ${e.message}`)
  process.exitCode = 1
})
