import { query, where } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import {
  col, cuantos, dinero, enlaceWhatsApp, etiquetaPedido, hora, mensajeError, METODOS, sumaItems, useLista, type Item, type Pedido, type Venta,
} from '../datos'
import { ICONOS } from '../iconos'
import { useImprimir } from '../imprimir'
import { cobrar, rangoDia } from '../pedidos'
import { T } from '../textos'
import type { Contexto } from './Restaurante'

type Cuenta = { clave: string; titulo: string; pedidos: Pedido[]; total: number; esMesa: boolean }

export default function Caja({ ctx }: { ctx: Contexto }) {
  const abiertos = useLista<Pedido>(query(col('pedidos'), where('pagado', '==', false)))
  const [inicio, fin] = rangoDia(new Date())
  const ventas = (useLista<Venta>(query(col('ventas'), where('fecha', '>=', inicio), where('fecha', '<', fin)), [inicio.toMillis()]) ?? [])
    .sort((a, b) => (b.fecha?.toMillis() ?? Date.now()) - (a.fecha?.toMillis() ?? Date.now()))
  const [elegida, setElegida] = useState<string | null>(null)
  const [ticket, setTicket] = useState<Venta | null>(null)

  // Una cuenta por mesa (aunque tenga varios pedidos) y una por cada pedido para llevar o a domicilio.
  const cuentas = useMemo(() => {
    const mapa = new Map<string, Cuenta>()
    for (const p of (abiertos ?? []).filter((x) => x.estado !== 'cancelado' && x.estado !== 'nuevo')) {
      const clave = p.tipo === 'mesa' ? `mesa:${p.mesaId}` : p.id
      const c = mapa.get(clave) ?? { clave, titulo: etiquetaPedido(p), pedidos: [], total: 0, esMesa: p.tipo === 'mesa' }
      c.pedidos.push(p); c.total += p.total
      mapa.set(clave, c)
    }
    return [...mapa.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { numeric: true }))
  }, [abiertos])
  const cuenta = cuentas.find((c) => c.clave === elegida)
  const hoy = ventas.reduce((s, v) => s + v.total, 0)

  return (
    <section className="pantalla">
      <div><h1>Caja</h1><p className="suave">Cuentas abiertas y lo cobrado hoy.</p></div>
      <div className="stats">
        <div className="stat"><b>{cuentas.length}</b><span>por cobrar</span></div>
        <div className="stat" style={{ gridColumn: 'span 2' }}><b>{dinero(hoy, ctx.moneda)}</b><span>cobrado hoy · {ventas.length} cuenta{ventas.length === 1 ? '' : 's'}</span></div>
      </div>
      {cuentas.length === 0 && <Vacio>No hay cuentas abiertas.</Vacio>}
      <div className="lista">
        {cuentas.map((c) => (
          <button key={c.clave} className="fila-item" onClick={() => setElegida(c.clave)}>
            <span className="ini" style={{ background: 'var(--acento)' }}>{c.esMesa ? ICONOS.menu : ICONOS.pedidos}</span>
            <div><b>{c.titulo}</b><small>{c.pedidos.length > 1 ? `${c.pedidos.length} pedidos · ` : ''}{cuantos(c.pedidos.flatMap((p) => p.items))} {T.platos}</small></div>
            <b>{dinero(c.total, ctx.moneda)}</b>
          </button>
        ))}
      </div>
      {ventas.length > 0 && (
        <div className="panel">
          <h3>Cobrado hoy</h3>
          {ventas.map((v) => (
            <button key={v.id} className="fila" style={{ justifyContent: 'space-between', border: 0, background: 'none', color: 'var(--fg)', padding: 0, textAlign: 'left' }} onClick={() => setTicket(v)}>
              <span>{v.fecha ? hora(v.fecha.toDate()) : '…'} · {v.detalle || 'Cuenta'} <span className="suave chico">· {v.metodo}</span></span><b>{dinero(v.total, ctx.moneda)}</b>
            </button>
          ))}
        </div>
      )}
      {cuenta && <Cobrar key={cuenta.clave} cuenta={cuenta} ctx={ctx} onCerrar={() => setElegida(null)} onCobrado={(v) => { setElegida(null); setTicket(v) }} />}
      {ticket && <VerTicket venta={ticket} ctx={ctx} onCerrar={() => setTicket(null)} />}
    </section>
  )
}

/** Junta los platos iguales para que la cuenta se lea fácil. */
export function agrupar(items: Item[]) {
  const mapa = new Map<string, Item>()
  for (const i of items) {
    const clave = `${i.platoId}|${i.precio}`
    const x = mapa.get(clave)
    mapa.set(clave, x ? { ...x, cantidad: x.cantidad + i.cantidad } : { ...i, nota: '' })
  }
  return [...mapa.values()]
}

function Cobrar({ cuenta, ctx, onCerrar, onCobrado }: { cuenta: Cuenta; ctx: Contexto; onCerrar: () => void; onCobrado: (v: Venta) => void }) {
  const items = cuenta.pedidos.flatMap((p) => p.items)
  const subtotal = sumaItems(items)
  const envio = cuenta.pedidos.reduce((s, p) => s + p.envio, 0)
  const pct = ctx.ajustes.propinaPct
  const [conPropina, setConPropina] = useState(cuenta.esMesa && pct > 0)
  const [descuento, setDescuento] = useState('')
  const [metodo, setMetodo] = useState(METODOS[0])
  const [recibido, setRecibido] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const propina = conPropina ? Math.round(subtotal * pct) / 100 : 0
  const desc = Math.max(0, Number(descuento) || 0)
  const total = Math.max(0, subtotal + envio + propina - desc)
  const vuelto = (Number(recibido) || 0) - total
  const pendientes = cuenta.pedidos.filter((p) => p.estado === 'aceptado' || p.estado === 'preparando').length

  async function guardar() {
    if (metodo === 'Efectivo' && recibido && vuelto < 0) { setError('Lo recibido no alcanza para el total.'); return }
    setGuardando(true); setError('')
    try {
      const r = await cobrar(cuenta.pedidos, { propina, descuento: desc, metodo, recibido: metodo === 'Efectivo' ? Number(recibido) || undefined : undefined, por: ctx.uid, porNombre: ctx.nombre })
      onCobrado({
        id: r.id, pedidos: cuenta.pedidos.map((p) => p.id), detalle: cuenta.titulo, items: r.items, subtotal: r.subtotal, envio: r.envio,
        propina, descuento: desc, total: r.total, metodo, recibido: Number(recibido) || undefined, fecha: null as never, por: ctx.uid, porNombre: ctx.nombre,
      })
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }

  return (
    <Hoja titulo={`Cobrar · ${cuenta.titulo}`} onCerrar={onCerrar}>
      {pendientes > 0 && <p className="aviso">Ojo: {pendientes} pedido{pendientes === 1 ? '' : 's'} de esta cuenta todavía está{pendientes === 1 ? '' : 'n'} en cocina.</p>}
      <div className="panel">
        {agrupar(items).map((i, n) => (
          <div key={n} className="fila" style={{ justifyContent: 'space-between' }}><span><b>{i.cantidad}×</b> {i.nombre}</span><span>{dinero(i.precio * i.cantidad, ctx.moneda)}</span></div>
        ))}
        <hr style={{ border: 0, borderTop: '1px solid var(--linea)', margin: 0, width: '100%' }} />
        <div className="fila" style={{ justifyContent: 'space-between' }}><span>Subtotal</span><span>{dinero(subtotal, ctx.moneda)}</span></div>
        {envio > 0 && <div className="fila" style={{ justifyContent: 'space-between' }}><span>Envío</span><span>{dinero(envio, ctx.moneda)}</span></div>}
        {pct > 0 && <label className="check" style={{ justifyContent: 'space-between' }}><span><input type="checkbox" checked={conPropina} onChange={(e) => setConPropina(e.target.checked)} /> Propina {pct} %</span><span>{dinero(propina, ctx.moneda)}</span></label>}
        <div className="fila" style={{ justifyContent: 'space-between', fontSize: '1.2rem' }}><b>Total</b><b>{dinero(total, ctx.moneda)}</b></div>
      </div>
      <div className="tabs" role="tablist" aria-label="Forma de pago">
        {METODOS.map((m) => <button key={m} className="tab" role="tab" aria-selected={metodo === m} onClick={() => setMetodo(m)}>{m}</button>)}
      </div>
      <div className="campos">
        {metodo === 'Efectivo' && <label className="campo" htmlFor="c-rec">Recibido<input id="c-rec" type="number" inputMode="decimal" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder={String(total)} /></label>}
        <label className="campo" htmlFor="c-desc">Descuento<input id="c-desc" type="number" inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} placeholder="0" /></label>
      </div>
      {metodo === 'Efectivo' && Number(recibido) > 0 && vuelto >= 0 && <p className="ok" style={{ fontSize: '1.1rem' }}>Vuelto: {dinero(vuelto, ctx.moneda)}</p>}
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={guardando} onClick={guardar}>{guardando ? 'Cobrando…' : `Cobrar ${dinero(total, ctx.moneda)}`}</button>
    </Hoja>
  )
}

export function Ticket({ venta, ctx }: { venta: Venta; ctx: Contexto }) {
  const a = ctx.ajustes
  const r = (izq: string, der: string) => <div className="renglon"><span>{izq}</span><span>{der}</span></div>
  return (
    <div className="ticket">
      <div style={{ textAlign: 'center' }}><b>{a.nombre}</b>{a.direccion && <div>{a.direccion}</div>}{a.telefono && <div>Tel. {a.telefono}</div>}</div>
      <div>{(venta.fecha?.toDate?.() ?? new Date()).toLocaleString('es-NI')}{venta.detalle ? ` · ${venta.detalle}` : ''}</div>
      <hr />
      {agrupar(venta.items).map((i, n) => <div key={n}>{r(`${i.cantidad} ${i.nombre}`, dinero(i.precio * i.cantidad, ctx.moneda))}</div>)}
      <hr />
      {r('Subtotal', dinero(venta.subtotal, ctx.moneda))}
      {venta.envio > 0 && r('Envío', dinero(venta.envio, ctx.moneda))}
      {venta.propina > 0 && r('Propina', dinero(venta.propina, ctx.moneda))}
      {venta.descuento > 0 && r('Descuento', `- ${dinero(venta.descuento, ctx.moneda)}`)}
      <b>{r('TOTAL', dinero(venta.total, ctx.moneda))}</b>
      {r('Pago', venta.metodo)}
      {venta.recibido ? <>{r('Recibido', dinero(venta.recibido, ctx.moneda))}{r('Vuelto', dinero(venta.recibido - venta.total, ctx.moneda))}</> : null}
      <div style={{ textAlign: 'center', marginTop: 8 }}>¡Gracias por su visita!</div>
      <div style={{ textAlign: 'center', fontSize: '.75rem' }}>Este ticket no es factura.</div>
    </div>
  )
}

function VerTicket({ venta, ctx, onCerrar }: { venta: Venta; ctx: Contexto; onCerrar: () => void }) {
  const { imprimir, zona } = useImprimir()
  const texto = `*${ctx.ajustes.nombre}*\n${agrupar(venta.items).map((i) => `${i.cantidad} ${i.nombre}: ${dinero(i.precio * i.cantidad, ctx.moneda)}`).join('\n')}\n` +
    `${venta.propina > 0 ? `Propina: ${dinero(venta.propina, ctx.moneda)}\n` : ''}*Total: ${dinero(venta.total, ctx.moneda)}* (${venta.metodo})\n¡Gracias por su visita!`
  return (
    <Hoja titulo="Cuenta cobrada" onCerrar={onCerrar}>
      <p className="ok">Cobrado: {dinero(venta.total, ctx.moneda)}</p>
      <Ticket venta={venta} ctx={ctx} />
      <div className="fila">
        <button className="btn btn-principal" onClick={() => imprimir(<Ticket venta={venta} ctx={ctx} />)}>{ICONOS.imprimir}Imprimir</button>
        <a className="btn btn-whatsapp" href={enlaceWhatsApp('', texto)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Mandar por WhatsApp</a>
      </div>
      {zona}
    </Hoja>
  )
}
