export async function fetchIncentivosData() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/incentivos/cierre-agosto`)
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.warn('Backend API no disponible, usando datos de respaldo:', err)
    return null
  }
}
