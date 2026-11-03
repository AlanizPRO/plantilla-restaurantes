import { doc, setDoc } from 'firebase/firestore'
import { useState } from 'react'
import { tiene } from '../cliente'
import { mensajeError, type Ajustes as TAjustes } from '../datos'
import { db } from '../firebase'
import { T } from '../textos'
import BotonRespaldo from './BotonRespaldo'

export default function Ajustes({ ajustes }: { ajustes: TAjustes }) {
  const [a, setA] = useState<TAjustes>(ajustes)
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok' | string>('')
  const poner = <K extends keyof TAjustes>(k: K, v: TAjustes[K]) => { setA((x) => ({ ...x, [k]: v })); setEstado('') }
  const numero = (s: string) => Math.max(0, Number(s) || 0)

  async function guardar() {
    setEstado('guardando')
    try { await setDoc(doc(db, 'ajustes', 'general'), { ...a, nombre: a.nombre.trim() }); setEstado('ok') } catch (e) { setEstado(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div><h1>Ajustes</h1><p className="suave">El nombre, el WhatsApp y el horario salen en el menú que ven los clientes.</p></div>
      <div className="panel">
        <h3>El negocio</h3>
        <div className="campos">
          <label className="campo" htmlFor="a-nombre">Nombre<input id="a-nombre" value={a.nombre} onChange={(e) => poner('nombre', e.target.value)} /></label>
          <label className="campo" htmlFor="a-tel">WhatsApp para pedidos<input id="a-tel" type="tel" inputMode="tel" value={a.telefono} onChange={(e) => poner('telefono', e.target.value)} /></label>
          <label className="campo" htmlFor="a-moneda">Moneda<input id="a-moneda" value={a.moneda} onChange={(e) => poner('moneda', e.target.value)} placeholder="C$ o US$" /></label>
        </div>
        <label className="campo" htmlFor="a-dir">Dirección<input id="a-dir" value={a.direccion} onChange={(e) => poner('direccion', e.target.value)} /></label>
        <label className="campo" htmlFor="a-hor">Horario<input id="a-hor" value={a.horario} onChange={(e) => poner('horario', e.target.value)} placeholder="Ej. Lunes a sábado, 11 a. m. a 9 p. m." /></label>
      </div>
      {tiene('enlinea') && (
        <div className="panel">
          <h3>Pedidos por el menú en línea</h3>
          <label className="check"><input type="checkbox" checked={a.pedidosEnLinea} onChange={(e) => poner('pedidosEnLinea', e.target.checked)} />Recibir pedidos desde el menú y los QR</label>
          <p className="suave chico">Si lo quitas, el menú se sigue viendo y el cliente manda su pedido por WhatsApp.</p>
          <label className="check"><input type="checkbox" checked={a.llevar} onChange={(e) => poner('llevar', e.target.checked)} />Para llevar</label>
          <label className="check"><input type="checkbox" checked={a.domicilio} onChange={(e) => poner('domicilio', e.target.checked)} />A domicilio</label>
          {a.domicilio && (
            <div className="campos">
              <label className="campo" htmlFor="a-envio">Costo del envío<input id="a-envio" type="number" inputMode="decimal" value={a.costoDomicilio} onChange={(e) => poner('costoDomicilio', numero(e.target.value))} /></label>
              <label className="campo" htmlFor="a-zona">Zonas donde entregan<input id="a-zona" value={a.zonaDomicilio} onChange={(e) => poner('zonaDomicilio', e.target.value)} placeholder="Ej. Solo Managua" /></label>
            </div>
          )}
          <label className="campo" htmlFor="a-pago">Datos para pagar por transferencia<textarea id="a-pago" value={a.datosPago} onChange={(e) => poner('datosPago', e.target.value)} placeholder="Ej. BAC córdobas 123456789 a nombre de…" /></label>
          <label className="campo" htmlFor="a-aviso">Aviso en el menú<textarea id="a-aviso" value={a.avisoMenu} onChange={(e) => poner('avisoMenu', e.target.value)} placeholder="Ej. Los pedidos a domicilio tardan unos 40 minutos." /></label>
        </div>
      )}
      <div className="panel">
        <h3>Caja</h3>
        <label className="campo" htmlFor="a-prop" style={{ maxWidth: 220 }}>Propina sugerida (%)<input id="a-prop" type="number" inputMode="numeric" value={a.propinaPct} onChange={(e) => poner('propinaPct', Math.min(30, numero(e.target.value)))} /></label>
        <p className="suave chico">Se marca sola al cobrar una {T.mesa}; el {T.mesero} la puede quitar. Pon 0 para no usarla.</p>
      </div>
      {estado === 'ok' && <p className="ok">Guardado.</p>}
      {estado && estado !== 'ok' && estado !== 'guardando' && <p className="error">{estado}</p>}
      <button className="btn btn-principal" disabled={estado === 'guardando'} onClick={guardar}>{estado === 'guardando' ? 'Guardando…' : 'Guardar'}</button>
      <BotonRespaldo hojas={[
        { coleccion: 'ventas', nombre: 'Ventas' }, { coleccion: 'pedidos', nombre: 'Pedidos' }, { coleccion: 'platos', nombre: T.Platos },
        { coleccion: 'categorias', nombre: 'Categorías' }, { coleccion: 'mesas', nombre: T.Mesas }, { coleccion: 'usuarios', nombre: 'Equipo' },
      ]} />
    </section>
  )
}
