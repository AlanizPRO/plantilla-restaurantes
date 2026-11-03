// Respaldo de todos los datos en un archivo de Excel (una hoja por tipo de dato). Solo para el dueño.
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { cliente } from './cliente'
import { db } from './firebase'

export type Hoja = { coleccion: string; nombre: string }

// Campos que no sirven en Excel (fotos y datos internos).
const OMITIR = new Set(['miniatura', 'datos', 'fotos'])

function valor(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return ''
  if (v instanceof Timestamp) return v.toDate().toLocaleString('es-NI')
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'string') return v.length > 32000 ? v.slice(0, 32000) : v
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' && x !== null ? texto(x) : String(x))).join(' · ')
  return texto(v)
}
const texto = (o: object) => Object.entries(o).filter(([k]) => !OMITIR.has(k)).map(([k, x]) => `${k}: ${valor(x)}`).join(', ')

export async function descargarRespaldo(hojas: Hoja[]) {
  const XLSX = await import('xlsx')
  const libro = XLSX.utils.book_new()
  for (const h of hojas) {
    const s = await getDocs(collection(db, h.coleccion))
    const filas = s.docs.map((d) => {
      const fila: Record<string, string | number | boolean> = { id: d.id }
      for (const [k, v] of Object.entries(d.data())) if (!OMITIR.has(k)) fila[k] = valor(v)
      return fila
    })
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas.length ? filas : [{ id: '(vacío)' }]), h.nombre.slice(0, 31))
  }
  const fecha = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(libro, `Respaldo ${cliente.nombreApp} ${fecha}.xlsx`)
}
