import { query, where } from 'firebase/firestore'
import { useState } from 'react'
import { tiene } from '../cliente'
import { Hoja, Vacio } from '../componentes'
import { ListaMenu, ResumenCarrito, useCarrito } from '../carrito'
import {
  ACTIVOS, col, cuantos, dinero, enlaceWhatsApp, ESTADOS, etiquetaPedido, hora, mensajeError, minutosDesde, NOMBRE_TIPO, sumaItems, useLista,
  type Pedido, type TipoPedido,
} from '../datos'
import { ICONOS } from '../iconos'
import { aceptar, agregarItems, cambiarEstado, crearPedido, recalcular } from '../pedidos'
import { T } from '../textos'
import type { Contexto } from './Restaurante'

const porHora = (a: Pedido, b: Pedido) => (a.creado?.toMillis() ?? Date.now()) - (b.creado?.toMillis() ?? Date.now())

export default function Pedidos({ ctx }: { ctx: Contexto }) {
  const pedidos = (useLista<Pedido>(query(col('pedidos'), where('estado', 'in', ACTIVOS))) ?? []).sort(porHora)
  const [nuevo, setNuevo] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const porAceptar = pedidos.filter((p) => p.estado === 'nuevo')
  const listos = pedidos.filter((p) => p.estado === 'listo')
  const enCocina = pedidos.filter((p) => p.estado === 'aceptado' || p.estado === 'preparando')
  const elegido = pedidos.find((p) => p.id === abierto)

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>Pedidos</h1><p className="suave">{pedidos.length ? `${pedidos.length} en curso` : 'Nada pendiente'}</p></div>
        <button className="btn btn-principal" onClick={() => setNuevo(true)}>+ Nuevo pedido</button>
      </div>

      {porAceptar.length > 0 && (
        <div className="panel" style={{ borderColor: 'var(--amarillo)', borderWidth: 2 }}>
          <h3>Llegaron por internet · por aceptar</h3>
          {porAceptar.map((p) => <PorAceptar key={p.id} p={p} ctx={ctx} />)}
        </div>
      )}
      {listos.length > 0 && <Grupo titulo="Listos para entregar" lista={listos} ctx={ctx} onAbrir={setAbierto} />}
      {enCocina.length > 0 && <Grupo titulo={tiene('cocina') ? 'En cocina' : 'En preparación'} lista={enCocina} ctx={ctx} onAbrir={setAbierto} />}
      {pedidos.length === 0 && <Vacio>No hay pedidos en curso. Toca "+ Nuevo pedido" cuando un cliente pida.</Vacio>}

      {nuevo && <TomarPedido ctx={ctx} onCerrar={() => setNuevo(false)} />}
      {elegido && <DetallePedido key={elegido.id} p={elegido} ctx={ctx} onCerrar={() => setAbierto(null)} />}
    </section>
  )
}

function Grupo({ titulo, lista, ctx, onAbrir }: { titulo: string; lista: Pedido[]; ctx: Contexto; onAbrir: (id: string) => void }) {
  return (
    <div className="pantalla" style={{ gap: 8 }}>
      <div className="etiqueta">{titulo}</div>
      {lista.map((p) => {
        const [estado, pill] = ESTADOS[p.estado]
        return (
          <button key={p.id} className="fila-item" onClick={() => onAbrir(p.id)}>
            <span className="ini" style={{ background: p.estado === 'listo' ? 'var(--verde)' : 'var(--principal)' }}>{p.tipo === 'mesa' ? ICONOS.menu : p.tipo === 'domicilio' ? ICONOS.moto : ICONOS.pedidos}</span>
            <div><b>{etiquetaPedido(p)}</b><small>{cuantos(p.items)} {cuantos(p.items) === 1 ? T.plato : T.platos} · {dinero(p.total, ctx.moneda)} · hace {minutosDesde(p.creado)} min</small></div>
            <span className={`pill ${pill}`}>{estado}</span>
          </button>
        )
      })}
    </div>
  )
}

function PorAceptar({ p, ctx }: { p: Pedido; ctx: Contexto }) {
  const [error, setError] = useState('')
  const r = recalcular(p, ctx.platos)
  async function si() { setError(''); try { await aceptar(p, ctx.platos) } catch (e) { setError(mensajeError(e)) } }
  async function no() {
    if (!confirm('¿Rechazar este pedido? El cliente lo verá como cancelado.')) return
    try { await cambiarEstado(p, 'cancelado') } catch (e) { setError(mensajeError(e)) }
  }
  const aviso = `Hola ${p.cliente.nombre.split(' ')[0]}, recibimos tu pedido en ${ctx.ajustes.nombre}. Total: ${dinero(r.total, ctx.moneda)}.`
  return (
    <div className="pantalla" style={{ gap: 6, borderBottom: '1px solid var(--linea)', paddingBottom: 10 }}>
      <div className="fila" style={{ justifyContent: 'space-between' }}><b>{etiquetaPedido(p)}</b><span className="suave chico">{p.creado ? hora(p.creado.toDate()) : ''}</span></div>
      <p className="chico">{p.items.map((i) => `${i.cantidad} ${i.nombre}${i.nota ? ` (${i.nota})` : ''}`).join(', ')}</p>
      {p.tipo === 'domicilio' && <p className="chico">{ICONOS.moto} {p.cliente.direccion}</p>}
      {p.nota && <p className="chico"><b>Nota:</b> {p.nota}</p>}
      {r.cambio && <p className="aviso">Algún precio cambió en el menú. Al aceptar se cobra con el precio de hoy: {dinero(r.total, ctx.moneda)}.</p>}
      {error && <p className="error">{error}</p>}
      <div className="fila">
        <button className="btn btn-principal" onClick={si}>Aceptar · {dinero(r.total, ctx.moneda)}</button>
        {p.cliente.telefono && <a className="btn btn-whatsapp btn-chico" href={enlaceWhatsApp(p.cliente.telefono, aviso)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Escribirle</a>}
        <button className="btn btn-rosa btn-chico" onClick={no}>Rechazar</button>
      </div>
    </div>
  )
}

function DetallePedido({ p, ctx, onCerrar }: { p: Pedido; ctx: Contexto; onCerrar: () => void }) {
  const [agregar, setAgregar] = useState(false)
  const [error, setError] = useState('')
  const hacer = (f: () => Promise<unknown>) => { setError(''); f().catch((e) => setError(mensajeError(e))) }
  const listo = `Hola ${p.cliente.nombre.split(' ')[0]}, tu pedido de ${ctx.ajustes.nombre} ya está listo${p.tipo === 'domicilio' ? ' y va en camino' : ''}. Total: ${dinero(p.total, ctx.moneda)}.`
  return (
    <Hoja titulo={etiquetaPedido(p)} onCerrar={onCerrar}>
      <div className="fila"><span className={`pill ${ESTADOS[p.estado][1]}`}>{ESTADOS[p.estado][0]}</span><span className="suave chico">{NOMBRE_TIPO[p.tipo]} · {p.creado ? hora(p.creado.toDate()) : ''}{p.por ? ` · tomó ${p.por}` : ''}</span></div>
      <div className="panel">
        {p.items.map((i, n) => (
          <div key={n} className="fila" style={{ justifyContent: 'space-between' }}>
            <span><b>{i.cantidad}×</b> {i.nombre}{i.nota && <span className="suave chico"> · {i.nota}</span>}</span><span>{dinero(i.precio * i.cantidad, ctx.moneda)}</span>
          </div>
        ))}
        {p.envio > 0 && <div className="fila" style={{ justifyContent: 'space-between' }}><span>Envío</span><span>{dinero(p.envio, ctx.moneda)}</span></div>}
        <div className="fila" style={{ justifyContent: 'space-between' }}><b>Total</b><b>{dinero(p.total, ctx.moneda)}</b></div>
      </div>
      {p.nota && <p><b>Nota:</b> {p.nota}</p>}
      {(p.cliente.telefono || p.cliente.direccion) && <p className="suave">{[p.cliente.telefono, p.cliente.direccion].filter(Boolean).join(' · ')}</p>}
      {error && <p className="error">{error}</p>}
      <div className="fila">
        {!tiene('cocina') && p.estado !== 'listo' && <button className="btn btn-principal" onClick={() => hacer(() => cambiarEstado(p, 'listo'))}>Ya está listo</button>}
        {p.estado === 'listo' && <button className="btn btn-principal" onClick={() => hacer(async () => { await cambiarEstado(p, 'entregado'); onCerrar() })}>Entregado</button>}
        {p.cliente.telefono && p.tipo !== 'mesa' && <a className="btn btn-whatsapp" href={enlaceWhatsApp(p.cliente.telefono, listo)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Avisar</a>}
        <button className="btn btn-borde" onClick={() => setAgregar(true)}>+ Agregar más</button>
        <button className="btn btn-rosa btn-chico" onClick={() => { if (confirm('¿Cancelar este pedido?')) hacer(async () => { await cambiarEstado(p, 'cancelado'); onCerrar() }) }}>Cancelar pedido</button>
      </div>
      <p className="suave chico">Se cobra en la pestaña Caja.</p>
      {agregar && <TomarPedido ctx={ctx} agregarA={p} onCerrar={() => setAgregar(false)} />}
    </Hoja>
  )
}

/** El mesero toma un pedido (o agrega cosas a uno que ya existe). */
export function TomarPedido({ ctx, agregarA, onCerrar }: { ctx: Contexto; agregarA?: Pedido; onCerrar: () => void }) {
  const carrito = useCarrito()
  const [paso, setPaso] = useState<'menu' | 'datos'>('menu')
  const [tipo, setTipo] = useState<TipoPedido>(ctx.mesas.length ? 'mesa' : 'llevar')
  const [mesaId, setMesaId] = useState('')
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', direccion: '' })
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const subtotal = sumaItems(carrito.items)
  const envio = tipo === 'domicilio' ? ctx.ajustes.costoDomicilio : 0

  async function guardar() {
    setError('')
    if (agregarA) {
      setGuardando(true)
      try { await agregarItems(agregarA, carrito.items); onCerrar() } catch (e) { setError(mensajeError(e)); setGuardando(false) }
      return
    }
    const mesa = ctx.mesas.find((m) => m.id === mesaId)
    if (tipo === 'mesa' && !mesa) { setError(`Escoge la ${T.mesa}.`); return }
    if (tipo === 'domicilio' && !cliente.direccion.trim()) { setError('Escribe la dirección.'); return }
    setGuardando(true)
    try {
      await crearPedido({
        tipo, mesaId: mesa?.id, mesaNombre: mesa?.nombre, cliente, items: carrito.items, envio, nota,
        equipo: { uid: ctx.uid, nombre: ctx.nombre },
      })
      onCerrar()
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }

  return (
    <Hoja titulo={agregarA ? `Agregar a ${etiquetaPedido(agregarA)}` : 'Nuevo pedido'} onCerrar={onCerrar}>
      {paso === 'menu' ? (
        <>
          <ListaMenu categorias={ctx.categorias} platos={ctx.platos} carrito={carrito} moneda={ctx.moneda} />
          <div style={{ height: 70 }} />
          {carrito.items.length > 0 && (
            <button className="barra-carrito" onClick={() => setPaso('datos')}>
              <span>{cuantos(carrito.items)} {cuantos(carrito.items) === 1 ? T.plato : T.platos} · {dinero(subtotal, ctx.moneda)}</span><span>Seguir ›</span>
            </button>
          )}
        </>
      ) : (
        <>
          <button className="btn btn-borde btn-chico" style={{ alignSelf: 'flex-start' }} onClick={() => setPaso('menu')}>‹ Volver al menú</button>
          <ResumenCarrito carrito={carrito} moneda={ctx.moneda} />
          {!agregarA && (
            <>
              <div className="tabs" role="tablist" aria-label="Tipo de pedido">
                {(['mesa', 'llevar', 'domicilio'] as TipoPedido[]).filter((t) => t !== 'mesa' || ctx.mesas.length).map((t) => (
                  <button key={t} className="tab" role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)}>{NOMBRE_TIPO[t]}</button>
                ))}
              </div>
              {tipo === 'mesa' ? (
                <div className="fila">
                  {ctx.mesas.map((m) => <button key={m.id} className={`btn btn-chico ${mesaId === m.id ? 'btn-principal' : 'btn-borde'}`} onClick={() => setMesaId(m.id)}>{m.nombre}</button>)}
                </div>
              ) : (
                <div className="campos">
                  <label className="campo" htmlFor="tp-nombre">Nombre<input id="tp-nombre" value={cliente.nombre} onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))} /></label>
                  <label className="campo" htmlFor="tp-tel">WhatsApp<input id="tp-tel" type="tel" inputMode="tel" value={cliente.telefono} onChange={(e) => setCliente((c) => ({ ...c, telefono: e.target.value }))} /></label>
                  {tipo === 'domicilio' && <label className="campo" htmlFor="tp-dir">Dirección *<input id="tp-dir" value={cliente.direccion} onChange={(e) => setCliente((c) => ({ ...c, direccion: e.target.value }))} /></label>}
                </div>
              )}
              <label className="campo" htmlFor="tp-nota">Nota para la cocina<input id="tp-nota" value={nota} maxLength={300} onChange={(e) => setNota(e.target.value)} placeholder="Ej. todo sin picante" /></label>
            </>
          )}
          <div className="fila" style={{ justifyContent: 'space-between' }}><b>Total</b><b>{dinero(subtotal + envio, ctx.moneda)}</b></div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-principal" disabled={guardando || !carrito.items.length} onClick={guardar}>{guardando ? 'Enviando…' : tiene('cocina') ? 'Enviar a cocina' : 'Guardar pedido'}</button>
        </>
      )}
    </Hoja>
  )
}
