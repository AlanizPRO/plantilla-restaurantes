import { doc, getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { tiene } from '../cliente'
import { Hoja, Logo } from '../componentes'
import { ListaMenu, ResumenCarrito, useCarrito } from '../carrito'
import { col, cuantos, dinero, enlaceWhatsApp, mensajeError, NOMBRE_TIPO, sumaItems, todos, useAjustesConEstado, useLista, type Categoria, type Mesa, type Plato, type TipoPedido } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { crearPedido } from '../pedidos'
import { T } from '../textos'

const CLAVE = 'misPedidos'
export function guardarMiPedido(codigo: string) {
  try { localStorage.setItem(CLAVE, JSON.stringify([codigo, ...leerMisPedidos()].slice(0, 5))) } catch { /* sin almacenamiento */ }
}
export function leerMisPedidos(): string[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') } catch { return [] }
}

// Menú para el cliente: /menu (para llevar o a domicilio) o /m/ID_DE_MESA (desde el QR de la mesa).
export default function MenuPublico({ mesaId }: { mesaId?: string }) {
  const [ajustes, listos] = useAjustesConEstado()
  const categorias = useLista<Categoria>(todos('categorias')) ?? []
  const platos = useLista<Plato>(todos('platos'))
  const [mesa, setMesa] = useState<Mesa | null | undefined>(mesaId ? undefined : null)
  const carrito = useCarrito()
  const [pedir, setPedir] = useState(false)
  const [foto, setFoto] = useState<{ nombre: string; src: string } | null>(null)
  const m = ajustes.moneda
  const ultimo = leerMisPedidos()[0]

  useEffect(() => {
    if (!mesaId) return
    getDoc(doc(col('mesas'), mesaId)).then((s) => setMesa(s.exists() ? ({ id: s.id, ...s.data() } as Mesa) : null), () => setMesa(null))
  }, [mesaId])

  async function verFoto(p: Plato) {
    setFoto({ nombre: p.nombre, src: p.miniatura ?? '' })
    try { const s = await getDoc(doc(db, 'fotos', p.id)); if (s.exists()) setFoto({ nombre: p.nombre, src: s.data().datos }) } catch { /* se queda la miniatura */ }
  }

  const enLinea = tiene('enlinea') && ajustes.pedidosEnLinea
  const puedePedir = !mesaId || !!mesa
  return (
    <div className="app publico">
      <header className="marca"><Logo /><div><h3>{ajustes.nombre}</h3><small className="suave">{mesa ? `${mesa.nombre} · Menú` : 'Menú'}</small></div></header>
      {(ajustes.horario || ajustes.direccion) && <p className="suave chico">{[ajustes.horario, ajustes.direccion].filter(Boolean).join(' · ')}</p>}
      {ajustes.avisoMenu && <p className="aviso" style={{ whiteSpace: 'pre-wrap' }}>{ajustes.avisoMenu}</p>}
      {mesaId && mesa === null && <p className="error">Este código QR ya no sirve. Pide ayuda a tu {T.mesero}.</p>}
      {ultimo && <a className="fila-item" href={`/p/${ultimo}`}>{ICONOS.pedidos}<div><b>Ver mi pedido</b><small>Cómo va el último que hiciste</small></div><span aria-hidden="true">›</span></a>}
      {platos === null || !listos ? <p className="suave">Cargando el menú…</p>
        : <ListaMenu categorias={categorias} platos={platos} carrito={carrito} moneda={m} puedePedir={puedePedir} onFoto={verFoto} />}
      <div style={{ height: 80 }} />
      {carrito.items.length > 0 && (
        <button className="barra-carrito" onClick={() => setPedir(true)}>
          <span>{cuantos(carrito.items)} {cuantos(carrito.items) === 1 ? T.plato : T.platos} · {dinero(sumaItems(carrito.items), m)}</span><span>Ver mi pedido ›</span>
        </button>
      )}
      {carrito.items.length === 0 && ajustes.telefono && (
        <a className="btn btn-whatsapp" href={enlaceWhatsApp(ajustes.telefono, 'Hola, quisiera hacer un pedido.')} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Escribir por WhatsApp</a>
      )}
      {pedir && platos && <Confirmar mesa={mesa ?? null} enLinea={enLinea} carrito={carrito} ajustes={ajustes} onCerrar={() => setPedir(false)} />}
      {foto && <Hoja titulo={foto.nombre} onCerrar={() => setFoto(null)}><img className="foto-grande" src={foto.src} alt={foto.nombre} /></Hoja>}
    </div>
  )
}

function Confirmar({ mesa, enLinea, carrito, ajustes, onCerrar }: {
  mesa: Mesa | null; enLinea: boolean; carrito: ReturnType<typeof useCarrito>; ajustes: ReturnType<typeof useAjustesConEstado>[0]; onCerrar: () => void
}) {
  const tipos: TipoPedido[] = mesa ? ['mesa'] : ([ajustes.llevar && 'llevar', ajustes.domicilio && 'domicilio'].filter(Boolean) as TipoPedido[])
  const [tipo, setTipo] = useState<TipoPedido>(tipos[0] ?? 'llevar')
  const [f, setF] = useState({ nombre: '', telefono: '', direccion: '', nota: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const m = ajustes.moneda
  const subtotal = sumaItems(carrito.items)
  const envio = tipo === 'domicilio' ? ajustes.costoDomicilio : 0
  const total = subtotal + envio

  const textoWhatsApp = `Hola, quiero pedir${mesa ? ` (${mesa.nombre})` : tipo === 'domicilio' ? ' a domicilio' : ' para llevar'}:\n` +
    carrito.items.map((i) => `• ${i.cantidad} ${i.nombre}${i.nota ? ` (${i.nota})` : ''}`).join('\n') +
    `\nTotal: ${dinero(total, m)}${f.nombre ? `\nA nombre de: ${f.nombre}` : ''}${tipo === 'domicilio' && f.direccion ? `\nDirección: ${f.direccion}` : ''}${f.nota ? `\nNota: ${f.nota}` : ''}`

  async function enviar() {
    if (tipo !== 'mesa') {
      if (!f.nombre.trim()) { setError('Escribe tu nombre.'); return }
      if (f.telefono.replace(/\D/g, '').length < 8) { setError('Escribe tu WhatsApp para avisarte.'); return }
      if (tipo === 'domicilio' && !f.direccion.trim()) { setError('Escribe la dirección de entrega.'); return }
    }
    setEnviando(true); setError('')
    try {
      const codigo = await crearPedido({ tipo, mesaId: mesa?.id, mesaNombre: mesa?.nombre, cliente: f, items: carrito.items, envio, nota: f.nota })
      guardarMiPedido(codigo)
      location.href = `/p/${codigo}`
    } catch (e) { setError(mensajeError(e)); setEnviando(false) }
  }

  return (
    <Hoja titulo="Mi pedido" onCerrar={onCerrar}>
      <ResumenCarrito carrito={carrito} moneda={m} />
      {carrito.items.length === 0 ? <p className="suave">Tu pedido está vacío.</p> : (
        <>
          {!mesa && tipos.length > 1 && (
            <div className="tabs" role="tablist" aria-label="Cómo lo quieres">
              {tipos.map((t) => <button key={t} className="tab" role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)}>{NOMBRE_TIPO[t]}</button>)}
            </div>
          )}
          {!mesa && tipos.length === 0 && <p className="aviso">Por ahora solo atendemos en el local. Escríbenos por WhatsApp.</p>}
          <div className="campos">
            <label className="campo" htmlFor="mp-nombre">{mesa ? '¿A nombre de quién? (opcional)' : 'Tu nombre *'}<input id="mp-nombre" value={f.nombre} onChange={(e) => setF((x) => ({ ...x, nombre: e.target.value }))} autoComplete="name" /></label>
            {!mesa && <label className="campo" htmlFor="mp-tel">WhatsApp *<input id="mp-tel" type="tel" inputMode="tel" value={f.telefono} onChange={(e) => setF((x) => ({ ...x, telefono: e.target.value }))} autoComplete="tel" placeholder="Ej. 8888 8888" /></label>}
          </div>
          {tipo === 'domicilio' && <label className="campo" htmlFor="mp-dir">Dirección de entrega *<textarea id="mp-dir" value={f.direccion} onChange={(e) => setF((x) => ({ ...x, direccion: e.target.value }))} placeholder="Barrio, calle y una seña" /></label>}
          {tipo === 'domicilio' && ajustes.zonaDomicilio && <p className="suave chico">Entregamos en: {ajustes.zonaDomicilio}</p>}
          <label className="campo" htmlFor="mp-nota">Nota (opcional)<input id="mp-nota" value={f.nota} maxLength={300} onChange={(e) => setF((x) => ({ ...x, nota: e.target.value }))} placeholder="Ej. sin hielo, traer cambio de 500" /></label>
          <div className="panel">
            {envio > 0 && <div className="fila" style={{ justifyContent: 'space-between' }}><span>Envío</span><span>{dinero(envio, m)}</span></div>}
            <div className="fila" style={{ justifyContent: 'space-between', fontSize: '1.15rem' }}><b>Total</b><b>{dinero(total, m)}</b></div>
          </div>
          {error && <p className="error">{error}</p>}
          {enLinea && (mesa || tipos.length > 0)
            ? <button className="btn btn-principal btn-ancho" disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar pedido'}</button>
            : ajustes.telefono && <a className="btn btn-whatsapp btn-ancho" href={enlaceWhatsApp(ajustes.telefono, textoWhatsApp)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar pedido por WhatsApp</a>}
        </>
      )}
    </Hoja>
  )
}
