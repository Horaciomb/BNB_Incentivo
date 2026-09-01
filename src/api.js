const base = import.meta.env.BASE_URL

async function get(ruta) {
  const res = await fetch(`${base}${ruta}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Campañas elegibles en el selector (vigentes, próximas y terminadas hace
// menos de 3 meses). Las reglas viven en campanas.json del backend.
export const fetchCampanas = () => get('api/campanas')

// Datos de una campaña. Lanza si el backend no responde: App distingue
// "cargando" de "falló" y avisa en vez de mostrar números inventados.
export const fetchIncentivos = (campanaId) => get(`api/incentivos/${campanaId}`)
