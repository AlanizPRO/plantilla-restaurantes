import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Logo } from '../componentes'
import { dinero, enlaceWhatsApp, ESTADOS, etiquetaPedido, hora, mensajeError, useAjustes, type EstadoPedido, type Pedido } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'

const PASOS: [EstadoPedido, string][] = [['nuevo', 'Recibido'], ['aceptado', 'Aceptado'], ['preparando', 'Preparando'], ['listo', 'Listo'], ['entregado', 'Entregado']]

// El cliente sigue su pedido con su enlace /p/CODIGO. Se actualiza solo.
export default function MiPedido({ codigo }: { codigo: string }) {
  const ajustes = useAjustes()
  const [p, setP] = useState<Pedido | null | undefined>(undefined)
  const [error, setError] = useState('')
  useEffect(() => onSnapshot(doc(db, 'pedidos', codigo), (s) => setP(s.exists() ? ({ id: s.id, ...s.data() } as Pedido) : null), () => setP(null)), [codigo])
  const m = ajustes.moneda

  if (p === undefined) return <div className="app publico"><p className="suave">Cargando…</p></div>
  if (p === null) return <div className="app publico"><p className="error">No encontré ese pedido. Revisa el enlace.</p></div>
  const paso = PASOS.findIndex(([e]) => e === p.estado)
  const resumen = `Hola, hice un pedido (${etiquetaPedido(p)}):\n${p.items.map((i) => `• ${i.cantidad} ${i.nombre}`).join('\n')}\nTotal: ${dinero(p.total, m)}\n${location.href}`
  async function cancelar() {
    if (!confirm('¿Cancelar tu pedido?')) return
    try { await updateDoc(doc(db, 'pedidos', codigo), { estado: 'cancelado' }) } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <div className="app publico">
      <header className="marca"><Logo /><div><h3>{ajustes.nombre}</h3><small className="suave">Mi pedido</small></div></header>
      <div className="panel">
        <div className="fila" style={{ justifyContent: 'space-between' }}><h2>{etiquetaPedido(p)}</h2><span className={`pill ${ESTADOS[p.estado][1]}`}>{p.estado === 'nuevo' ? 'Esperando que lo acepten' : ESTADOS[p.estado][0]}</span></div>
        {p.estado !== 'cancelado' && (
          <div className="pasos">
            {PASOS.map(([e, n], i) => <div key={e} className={`paso ${i <= paso ? 'hecho' : ''}`}><span>{i <= paso ? '✓' : i + 1}</span>{n}</div>)}
          </div>
        )}
        {p.estado === 'cancelado' && <p className="error">Este pedido se canceló. Si es un error, escríbenos.</p>}
        <p className="suave chico">Pedido a las {p.creado ? hora(p.creado.toDate()) : '…'}. Esta página se actualiza sola.</p>
      </div>
      <div className="panel">
        {p.items.map((i, n) => <div key={n} className="fila" style={{ justifyContent: 'space-between' }}><span><b>{i.cantidad}×</b> {i.nombre}{i.nota && <span className="suave chico"> · {i.nota}</span>}</span><span>{dinero(i.precio * i.cantidad, m)}</span></div>)}
        {p.envio > 0 && <div className="fila" style={{ justifyContent: 'space-between' }}><span>Envío</span><span>{dinero(p.envio, m)}</span></div>}
        <div className="fila" style={{ justifyContent: 'space-between', fontSize: '1.15rem' }}><b>Total</b><b>{dinero(p.total, m)}</b></div>
        {p.pagado && <p className="ok">Pagado. ¡Gracias!</p>}
      </div>
      {p.tipo !== 'mesa' && ajustes.datosPago && !p.pagado && p.estado !== 'cancelado' && (
        <div className="panel"><h3>Si pagas por transferencia</h3><p style={{ whiteSpace: 'pre-wrap' }}>{ajustes.datosPago}</p><p className="suave chico">Manda la foto del comprobante por WhatsApp.</p></div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="fila">
        {ajustes.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(ajustes.telefono, resumen)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Escribir al restaurante</a>}
        {p.estado === 'nuevo' && <button className="btn btn-rosa" onClick={cancelar}>Cancelar pedido</button>}
        <a className="btn btn-borde" href={p.tipo === 'mesa' && p.mesaId ? `/m/${p.mesaId}` : '/menu'}>Pedir algo más</a>
      </div>
    </div>
  )
}
