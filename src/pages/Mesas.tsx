import { deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { tiene } from '../cliente'
import { col, mensajeError, type Mesa } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { T } from '../textos'
import type { Contexto } from './Restaurante'

const enlaceMesa = (m: Mesa) => `${location.origin}/m/${m.id}`
const enlaceMenu = () => `${location.origin}/menu`

function useQR(texto: string) {
  const [img, setImg] = useState('')
  useEffect(() => {
    let vivo = true
    QRCode.toDataURL(texto, { margin: 1, width: 400, errorCorrectionLevel: 'M' }).then((u) => { if (vivo) setImg(u) }, () => setImg(''))
    return () => { vivo = false }
  }, [texto])
  return img
}

function TarjetaQR({ titulo, enlace, nombre }: { titulo: string; enlace: string; nombre: string }) {
  const img = useQR(enlace)
  return (
    <div className="qr">
      <b>{nombre}</b>
      {img ? <img src={img} alt={`Código QR de ${titulo}`} /> : <div style={{ width: 200, height: 200 }} />}
      <b style={{ fontSize: '1.3rem' }}>{titulo}</b>
      <small>Escanea para ver el menú{tiene('enlinea') ? ' y pedir' : ''}</small>
    </div>
  )
}

// El dueño crea sus mesas. Cada una tiene su QR: el cliente lo escanea y su pedido llega con el número de mesa.
export default function Mesas({ ctx }: { ctx: Contexto }) {
  const [cuantas, setCuantas] = useState('')
  const [error, setError] = useState('')
  const hacer = (f: () => Promise<unknown>) => { setError(''); f().catch((e) => setError(mensajeError(e))) }

  async function agregar() {
    const n = Math.min(60, Math.max(1, Number(cuantas) || 1))
    const base = ctx.mesas.length
    setCuantas('')
    const lote = writeBatch(db)
    for (let i = 1; i <= n; i++) lote.set(doc(col('mesas')), { nombre: `${T.Mesa} ${base + i}`, orden: base + i })
    await lote.commit()
  }
  async function renombrar(m: Mesa) {
    const nombre = prompt(`Nombre (ej. ${T.Mesa} 5, Terraza 2, Barra)`, m.nombre)?.trim()
    if (nombre && nombre !== m.nombre) await updateDoc(doc(db, 'mesas', m.id), { nombre })
  }
  async function borrar(m: Mesa) { if (confirm(`¿Borrar ${m.nombre}? Su QR dejará de servir.`)) await deleteDoc(doc(db, 'mesas', m.id)) }

  return (
    <section className="pantalla">
      <div className="no-imprimir"><h1>{T.Mesas} y códigos QR</h1>
        <p className="suave">Imprime los QR y ponlos en cada {T.mesa}. {tiene('enlinea') ? `El cliente escanea, pide desde su teléfono y el pedido llega aquí con el nombre de la ${T.mesa}.` : 'El cliente escanea y ve el menú.'}</p></div>
      {error && <p className="error no-imprimir">{error}</p>}
      <div className="panel no-imprimir">
        <form className="fila" onSubmit={(e) => { e.preventDefault(); hacer(agregar) }}>
          <label className="campo" htmlFor="ms-n" style={{ width: 120 }}>Cuántas<input id="ms-n" type="number" inputMode="numeric" min={1} max={60} value={cuantas} onChange={(e) => setCuantas(e.target.value)} placeholder="1" /></label>
          <button className="btn btn-principal" type="submit" style={{ alignSelf: 'flex-end' }}>+ Agregar {T.mesas}</button>
          <button className="btn btn-borde" type="button" style={{ alignSelf: 'flex-end' }} onClick={() => print()}>{ICONOS.imprimir}Imprimir QR</button>
        </form>
        {ctx.mesas.map((m) => (
          <div key={m.id} className="fila" style={{ justifyContent: 'space-between' }}>
            <b>{m.nombre}</b>
            <div className="fila">
              <button className="btn btn-borde btn-chico" onClick={() => hacer(() => renombrar(m))}>Renombrar</button>
              <button className="btn btn-rosa btn-chico" aria-label={`Borrar ${m.nombre}`} onClick={() => hacer(() => borrar(m))}>×</button>
            </div>
          </div>
        ))}
      </div>
      <div className="qr-hoja">
        <TarjetaQR titulo="Menú" enlace={enlaceMenu()} nombre={ctx.ajustes.nombre} />
        {ctx.mesas.map((m) => <TarjetaQR key={m.id} titulo={m.nombre} enlace={enlaceMesa(m)} nombre={ctx.ajustes.nombre} />)}
      </div>
      <p className="suave chico no-imprimir">El QR "Menú" sirve para Facebook, Instagram o la puerta: {tiene('enlinea') ? 'ahí piden para llevar o a domicilio' : 'ahí ven el menú'}.</p>
    </section>
  )
}
