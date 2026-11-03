// Crear pedidos, cambiar su estado y cobrarlos.
import { arrayUnion, doc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { codigoEnlace, sumaItems, type EstadoPedido, type Item, type Pedido, type Plato, type TipoPedido } from './datos'
import { db } from './firebase'

export type NuevoPedido = {
  tipo: TipoPedido; mesaId?: string; mesaNombre?: string
  cliente: { nombre: string; telefono: string; direccion?: string }
  items: Item[]; envio: number; nota?: string
  equipo?: { uid: string; nombre: string }
}

const limpiarItems = (items: Item[]) => items.filter((i) => i.cantidad > 0).map((i) => ({
  platoId: i.platoId, nombre: i.nombre.slice(0, 120), precio: i.precio, cantidad: Math.min(99, Math.round(i.cantidad)), nota: (i.nota ?? '').trim().slice(0, 200),
}))

export async function crearPedido(p: NuevoPedido) {
  const codigo = codigoEnlace()
  const items = limpiarItems(p.items)
  const subtotal = sumaItems(items)
  const datos: Record<string, unknown> = {
    tipo: p.tipo,
    cliente: { nombre: p.cliente.nombre.trim().slice(0, 80), telefono: p.cliente.telefono.trim().slice(0, 30), ...(p.tipo === 'domicilio' ? { direccion: (p.cliente.direccion ?? '').trim().slice(0, 300) } : {}) },
    items, subtotal, envio: p.envio, total: subtotal + p.envio, nota: (p.nota ?? '').trim().slice(0, 300),
    estado: p.equipo ? 'aceptado' : 'nuevo', origen: p.equipo ? 'equipo' : 'enlace', pagado: false, creado: serverTimestamp(),
  }
  if (p.tipo === 'mesa') { datos.mesaId = p.mesaId; datos.mesaNombre = p.mesaNombre }
  if (p.equipo) { datos.por = p.equipo.nombre.slice(0, 80); datos.tiempos = { aceptado: Date.now() } }
  await setDoc(doc(db, 'pedidos', codigo), datos)
  return codigo
}

/** Al aceptar un pedido que llegó por enlace, los precios se vuelven a tomar del menú (por si alguien los cambió). */
export function recalcular(p: Pedido, platos: Plato[]) {
  const items = p.items.map((i) => {
    const plato = platos.find((x) => x.id === i.platoId)
    return { ...i, precio: plato ? plato.precio : i.precio, nombre: plato ? plato.nombre : i.nombre }
  })
  const subtotal = sumaItems(items)
  const cambio = items.some((i, n) => i.precio !== p.items[n].precio)
  return { items, subtotal, total: subtotal + p.envio, cambio }
}

export async function aceptar(p: Pedido, platos: Plato[]) {
  const r = recalcular(p, platos)
  await updateDoc(doc(db, 'pedidos', p.id), { items: r.items, subtotal: r.subtotal, total: r.total, estado: 'aceptado', 'tiempos.aceptado': Date.now() })
}

export const cambiarEstado = (p: Pedido, estado: EstadoPedido) =>
  updateDoc(doc(db, 'pedidos', p.id), { estado, [`tiempos.${estado}`]: Date.now() })

/** Agrega más cosas a un pedido que todavía no se cobra (por ejemplo, otra ronda en la misma mesa). */
export async function agregarItems(p: Pedido, nuevos: Item[]) {
  const items = [...p.items, ...limpiarItems(nuevos)]
  const subtotal = sumaItems(items)
  const volverACocina = p.estado === 'listo' || p.estado === 'entregado'
  await updateDoc(doc(db, 'pedidos', p.id), {
    items, subtotal, total: subtotal + p.envio,
    ...(volverACocina ? { estado: 'aceptado', 'tiempos.aceptado': Date.now() } : {}),
  })
}

export type Cobro = { propina: number; descuento: number; metodo: string; recibido?: number; por: string; porNombre: string }

/** Cobra una cuenta (uno o varios pedidos de la misma mesa) y deja la venta en la caja del día. */
export async function cobrar(pedidos: Pedido[], c: Cobro) {
  const ventaRef = doc(db, 'ventas', codigoEnlace())
  const items = pedidos.flatMap((p) => p.items)
  const subtotal = sumaItems(items)
  const envio = pedidos.reduce((s, p) => s + p.envio, 0)
  const total = Math.max(0, subtotal + envio + c.propina - c.descuento)
  const lote = writeBatch(db)
  lote.set(ventaRef, {
    pedidos: pedidos.map((p) => p.id), detalle: pedidos[0] ? (pedidos[0].tipo === 'mesa' ? pedidos[0].mesaNombre ?? '' : pedidos[0].cliente.nombre) : '',
    ...(pedidos[0]?.mesaNombre ? { mesaNombre: pedidos[0].mesaNombre } : {}),
    items, subtotal, envio, propina: c.propina, descuento: c.descuento, total, metodo: c.metodo,
    ...(c.recibido ? { recibido: c.recibido } : {}), fecha: serverTimestamp(), por: c.por, porNombre: c.porNombre,
  })
  for (const p of pedidos) {
    lote.update(doc(db, 'pedidos', p.id), {
      pagado: true, ventaId: ventaRef.id,
      ...(p.estado === 'listo' || p.estado === 'nuevo' ? { estado: 'entregado', 'tiempos.entregado': Date.now() } : {}),
    })
  }
  await lote.commit()
  return { id: ventaRef.id, total, items, subtotal, envio }
}

export const inicioDia = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const rangoDia = (d: Date) => [Timestamp.fromDate(inicioDia(d)), Timestamp.fromDate(new Date(inicioDia(d).getTime() + 86400000))] as const
export { arrayUnion }
