import { deleteDoc, doc, query, where } from 'firebase/firestore'
import { useState } from 'react'
import { Vacio } from '../componentes'
import { aInputFecha, col, deInputFecha, dinero, fechaLarga, hora, mensajeError, METODOS, sumarDias, useLista, type Venta } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { useImprimir } from '../imprimir'
import { rangoDia } from '../pedidos'
import { T } from '../textos'
import type { Contexto } from './Restaurante'

// Cierre del día (solo el dueño): cuánto entró, por forma de pago, propinas y lo más vendido.
export default function Cierre({ ctx }: { ctx: Contexto }) {
  const [dia, setDia] = useState(() => new Date())
  const [inicio, fin] = rangoDia(dia)
  const ventas = (useLista<Venta>(query(col('ventas'), where('fecha', '>=', inicio), where('fecha', '<', fin)), [inicio.toMillis()]) ?? [])
    .sort((a, b) => (a.fecha?.toMillis() ?? 0) - (b.fecha?.toMillis() ?? 0))
  const [error, setError] = useState('')
  const { imprimir, zona } = useImprimir()
  const m = ctx.moneda
  const total = ventas.reduce((s, v) => s + v.total, 0)
  const propinas = ventas.reduce((s, v) => s + (v.propina ?? 0), 0)
  const descuentos = ventas.reduce((s, v) => s + (v.descuento ?? 0), 0)
  const porMetodo = [...new Set([...METODOS, ...ventas.map((v) => v.metodo)])].map((mt) => [mt, ventas.filter((v) => v.metodo === mt).reduce((s, v) => s + v.total, 0)] as const).filter(([, n]) => n > 0)
  const conteo = new Map<string, { nombre: string; cantidad: number; monto: number }>()
  for (const i of ventas.flatMap((v) => v.items ?? [])) {
    const x = conteo.get(i.platoId) ?? { nombre: i.nombre, cantidad: 0, monto: 0 }
    x.cantidad += i.cantidad; x.monto += i.cantidad * i.precio; conteo.set(i.platoId, x)
  }
  const top = [...conteo.values()].sort((a, b) => b.cantidad - a.cantidad)
  const esHoy = aInputFecha(dia) === aInputFecha(new Date())

  async function borrar(v: Venta) {
    if (!confirm(`¿Borrar la venta de ${dinero(v.total, m)}? Úsalo solo si se cobró por error.`)) return
    try { await deleteDoc(doc(db, 'ventas', v.id)) } catch (e) { setError(mensajeError(e)) }
  }

  const resumen = (
    <div className="ticket">
      <b>{ctx.ajustes.nombre} · Cierre del {fechaLarga(dia)}</b>
      <hr />
      <div className="renglon"><span>Cuentas</span><span>{ventas.length}</span></div>
      {porMetodo.map(([mt, n]) => <div key={mt} className="renglon"><span>{mt}</span><span>{dinero(n, m)}</span></div>)}
      <div className="renglon"><span>Propinas</span><span>{dinero(propinas, m)}</span></div>
      <div className="renglon"><span>Descuentos</span><span>{dinero(descuentos, m)}</span></div>
      <b><div className="renglon"><span>TOTAL</span><span>{dinero(total, m)}</span></div></b>
      <hr />
      {top.slice(0, 15).map((x) => <div key={x.nombre} className="renglon"><span>{x.cantidad} {x.nombre}</span><span>{dinero(x.monto, m)}</span></div>)}
    </div>
  )

  return (
    <section className="pantalla">
      <div><h1>Cierre del día</h1><p className="suave">{fechaLarga(dia)}</p></div>
      <div className="fila">
        <button className="btn btn-borde btn-chico" onClick={() => setDia((d) => sumarDias(d, -1))}>‹ Día anterior</button>
        <label className="campo" htmlFor="ci-dia"><span hidden>Día</span><input id="ci-dia" type="date" value={aInputFecha(dia)} onChange={(e) => e.target.value && setDia(deInputFecha(e.target.value))} /></label>
        {!esHoy && <button className="btn btn-borde btn-chico" onClick={() => setDia((d) => sumarDias(d, 1))}>Día siguiente ›</button>}
      </div>
      <div className="stats">
        <div className="stat" style={{ gridColumn: 'span 2' }}><b>{dinero(total, m)}</b><span>vendido</span></div>
        <div className="stat"><b>{ventas.length}</b><span>cuentas</span></div>
        <div className="stat"><b>{dinero(ventas.length ? total / ventas.length : 0, m)}</b><span>promedio</span></div>
        <div className="stat"><b>{dinero(propinas, m)}</b><span>propinas</span></div>
        <div className="stat"><b>{dinero(descuentos, m)}</b><span>descuentos</span></div>
      </div>
      {ventas.length === 0 && <Vacio>No hubo ventas ese día.</Vacio>}
      {porMetodo.length > 0 && (
        <div className="panel">
          <h3>Por forma de pago</h3>
          {porMetodo.map(([mt, n]) => <div key={mt} className="fila" style={{ justifyContent: 'space-between' }}><span>{mt}</span><b>{dinero(n, m)}</b></div>)}
          <p className="suave chico">El efectivo que debe haber en caja es {dinero(porMetodo.find(([mt]) => mt === 'Efectivo')?.[1] ?? 0, m)} (más el fondo con que abrieron).</p>
        </div>
      )}
      {top.length > 0 && (
        <div className="panel">
          <h3>Lo más vendido</h3>
          {top.slice(0, 10).map((x, n) => <div key={x.nombre} className="fila" style={{ justifyContent: 'space-between' }}><span>{n + 1}. {x.nombre}</span><span><b>{x.cantidad}</b> <span className="suave chico">· {dinero(x.monto, m)}</span></span></div>)}
          {top.length > 10 && <p className="suave chico">y {top.length - 10} {T.platos} más.</p>}
        </div>
      )}
      {ventas.length > 0 && (
        <div className="panel">
          <h3>Cuentas cobradas</h3>
          {error && <p className="error">{error}</p>}
          {ventas.map((v) => (
            <div key={v.id} className="fila" style={{ justifyContent: 'space-between' }}>
              <span>{v.fecha ? hora(v.fecha.toDate()) : '…'} · {v.detalle || 'Cuenta'} <span className="suave chico">· {v.metodo} · {v.porNombre}</span></span>
              <span className="fila"><b>{dinero(v.total, m)}</b><button className="btn btn-borde btn-chico" aria-label="Borrar venta" onClick={() => borrar(v)}>×</button></span>
            </div>
          ))}
          <button className="btn btn-borde" onClick={() => imprimir(resumen)}>{ICONOS.imprimir}Imprimir el cierre</button>
        </div>
      )}
      {zona}
    </section>
  )
}
