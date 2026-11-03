import {
  collection, doc, onSnapshot, query, type DocumentData, type Query, type Timestamp,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { cliente } from './cliente'
import { T } from './textos'
import { db } from './firebase'

// ---------- Tipos ----------
export type Categoria = { id: string; nombre: string; orden: number }
// Lo ve el público en el menú: no lleva costos.
export type Plato = {
  id: string; nombre: string; descripcion: string; precio: number; categoriaId: string
  miniatura?: string; conFoto?: boolean; disponible: boolean; orden: number
}
export type Mesa = { id: string; nombre: string; orden: number }
export type TipoPedido = 'mesa' | 'llevar' | 'domicilio'
export type EstadoPedido = 'nuevo' | 'aceptado' | 'preparando' | 'listo' | 'entregado' | 'cancelado'
export type Item = { platoId: string; nombre: string; precio: number; cantidad: number; nota: string }
export type Pedido = {
  id: string; tipo: TipoPedido; mesaId?: string; mesaNombre?: string
  cliente: { nombre: string; telefono: string; direccion?: string }
  items: Item[]; subtotal: number; envio: number; total: number; nota?: string
  estado: EstadoPedido; origen: 'enlace' | 'equipo'; por?: string
  pagado: boolean; ventaId?: string; creado: Timestamp; tiempos?: Partial<Record<EstadoPedido, number>>
}
export type Venta = {
  id: string; pedidos: string[]; detalle: string; mesaNombre?: string; items: Item[]
  subtotal: number; envio: number; propina: number; descuento: number; total: number
  metodo: string; recibido?: number; fecha: Timestamp; por: string; porNombre: string
}
export type Ajustes = {
  nombre: string; telefono: string; direccion: string; horario: string; moneda: string
  pedidosEnLinea: boolean; llevar: boolean; domicilio: boolean; costoDomicilio: number; zonaDomicilio: string
  propinaPct: number; datosPago: string; avisoMenu: string
}

export const AJUSTES_INICIALES: Ajustes = {
  nombre: cliente.nombreApp,
  telefono: '',
  direccion: cliente.ciudad ?? '',
  horario: '',
  moneda: cliente.venta.moneda,
  pedidosEnLinea: true,
  llevar: true,
  domicilio: false,
  costoDomicilio: 0,
  zonaDomicilio: '',
  propinaPct: 10,
  datosPago: '',
  avisoMenu: '',
}

export const ESTADOS: Record<EstadoPedido, [string, string]> = {
  nuevo: ['Por aceptar', 'p-amarillo'],
  aceptado: ['En cola', 'p-principal'],
  preparando: ['Preparando', 'p-principal'],
  listo: ['Listo para entregar', 'p-verde'],
  entregado: ['Entregado', 'p-gris'],
  cancelado: ['Cancelado', 'p-rosa'],
}
export const NOMBRE_TIPO: Record<TipoPedido, string> = { mesa: T.Mesa, llevar: 'Para llevar', domicilio: 'A domicilio' }
export const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia']
export const ACTIVOS: EstadoPedido[] = ['nuevo', 'aceptado', 'preparando', 'listo']

export const sumaItems = (items: Item[]) => items.reduce((s, i) => s + i.precio * i.cantidad, 0)
export const cuantos = (items: Item[]) => items.reduce((s, i) => s + i.cantidad, 0)
export const hora = (d: Date) => d.toLocaleTimeString('es-NI', { hour: 'numeric', minute: '2-digit' })
export const minutosDesde = (t?: Timestamp | null) => (t ? Math.max(0, Math.floor((Date.now() - t.toMillis()) / 60000)) : 0)
export const etiquetaPedido = (p: Pick<Pedido, 'tipo' | 'mesaNombre' | 'cliente'>) =>
  p.tipo === 'mesa' ? p.mesaNombre || T.Mesa : `${NOMBRE_TIPO[p.tipo]} · ${p.cliente.nombre || 'sin nombre'}`
/** Para buscar sin tildes ni mayúsculas. */
export const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// ---------- Lecturas en vivo ----------
export function useLista<T>(q: Query<DocumentData> | null, deps: unknown[] = []) {
  const [lista, setLista] = useState<T[] | null>(null)
  useEffect(() => {
    if (!q) { setLista([]); return }
    return onSnapshot(q, (s) => setLista(s.docs.map((d) => ({ id: d.id, ...d.data() }) as T)), (e) => {
      console.error(e); setLista([])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return lista
}

export function useDoc<T>(ruta: string | null) {
  const [dato, setDato] = useState<T | null | undefined>(undefined)
  useEffect(() => {
    if (!ruta) { setDato(null); return }
    return onSnapshot(doc(db, ruta), (s) => setDato(s.exists() ? ({ id: s.id, ...s.data() } as T) : null), () => setDato(null))
  }, [ruta])
  return dato
}

export function useAjustesConEstado(): [Ajustes, boolean] {
  const [estado, setEstado] = useState<[Ajustes, boolean]>([AJUSTES_INICIALES, false])
  useEffect(() => onSnapshot(doc(db, 'ajustes', 'general'), (s) => {
    setEstado([s.exists() ? { ...AJUSTES_INICIALES, ...s.data() } : AJUSTES_INICIALES, true])
  }, () => setEstado([AJUSTES_INICIALES, true])), [])
  return estado
}
export const useAjustes = () => useAjustesConEstado()[0]

export const col = (nombre: string) => collection(db, nombre)
export const todos = (nombre: string) => query(col(nombre))

// ---------- Textos y números ----------
export const dinero = (n: number, moneda: string) => `${moneda} ${(Math.round(n * 100) / 100).toLocaleString('es-NI', { maximumFractionDigits: 2 })}`

export function codigoAzar(largo = 6, letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') {
  return Array.from(crypto.getRandomValues(new Uint32Array(largo)), (n) => letras[n % letras.length]).join('')
}
// Código largo para enlaces públicos: imposible de adivinar.
export const codigoEnlace = () => codigoAzar(20, 'abcdefghijkmnpqrstuvwxyz23456789')
export const fechaCorta = (d: Date) => d.toLocaleDateString('es-NI', { day: 'numeric', month: 'short' })
export const fechaLarga = (d: Date) => d.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })
/** "2026-11-15" para un input de fecha, en hora local. */
export const aInputFecha = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const deInputFecha = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12) }
export const sumarDias = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

// ---------- WhatsApp ----------
export function enlaceWhatsApp(telefono: string | undefined, texto: string) {
  let n = (telefono ?? '').replace(/\D/g, '')
  if (n.length === 8) n = `505${n}` // número de Nicaragua sin código de país
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

export function mensajeError(e: unknown) {
  const codigo = (e as { code?: string })?.code ?? ''
  if (codigo.includes('permission-denied')) return 'No tienes permiso para hacer eso.'
  if (codigo.includes('unavailable')) return 'Sin conexión. Se guardará cuando vuelva la señal.'
  if (codigo.includes('popup-closed')) return 'Se cerró la ventana de Google antes de terminar.'
  if (codigo.includes('resource-exhausted') || codigo.includes('invalid-argument')) return 'La foto es demasiado grande. Prueba con otra.'
  return 'Algo salió mal. Intenta de nuevo.'
}

export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
