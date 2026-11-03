import { deleteDoc, doc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { useState } from 'react'
import { cliente } from '../cliente'
import { T } from '../textos'
import { Hoja, Vacio } from '../componentes'
import { codigoAzar, col, enlaceWhatsApp, iniciales, mensajeError, todos, useLista } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'

type Vendedor = { id: string; nombre: string; correo: string; telefono?: string; activo?: boolean; rol?: string }
type Invitacion = { id: string; nombre: string; telefono?: string; usada: boolean; rol?: string }

const enlaceInvitacion = (codigo: string) => `${location.origin}/?i=${codigo}`
const nombreRol = (rol?: string) => (rol === 'cocina' ? 'Cocina' : T.Mesero)
const textoInvitacion = (i: { id: string; nombre: string; rol?: string }) =>
  `Hola ${i.nombre.split(' ')[0]}, te invito a la app de ${cliente.nombreApp} (${nombreRol(i.rol).toLowerCase()}). Ábrela aquí y entra con tu cuenta de Google: ${enlaceInvitacion(i.id)}\n(Si te pide código: ${i.id})`

export default function Equipo() {
  const vendedores = useLista<Vendedor>(todos('usuarios')) ?? []
  const pendientes = useLista<Invitacion>(query(col('invitaciones'), where('usada', '==', false))) ?? []
  const [nueva, setNueva] = useState(false)
  const [error, setError] = useState('')

  async function activar(v: Vendedor, activo: boolean) {
    if (!activo && !confirm(`¿Quitarle el acceso a ${v.nombre}? Ya no podrá entrar a la app.`)) return
    try { await updateDoc(doc(db, 'usuarios', v.id), { activo }) } catch (e) { setError(mensajeError(e)) }
  }
  async function cancelar(i: Invitacion) {
    try { await deleteDoc(doc(db, 'invitaciones', i.id)) } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>Equipo</h1><p className="suave">{T.Meseros}: toman pedidos y cobran. Cocina: ve las comandas y marca lo que está listo. Ninguno cambia el menú ni ve el cierre del día.</p></div>
        <button className="btn btn-principal" onClick={() => setNueva(true)}>+ Invitar</button>
      </div>
      {error && <p className="error">{error}</p>}
      {vendedores.length === 0 && pendientes.length === 0 && <Vacio>Todavía no hay nadie. Toca "+ Invitar" y mándale el enlace por WhatsApp.</Vacio>}
      <div className="lista">
        {vendedores.map((v) => (
          <div key={v.id} className="fila-item">
            <span className="ini" style={v.activo === false ? { background: 'var(--suave)' } : undefined}>{iniciales(v.nombre || v.correo)}</span>
            <div><b>{v.nombre || v.correo}</b><small>{nombreRol(v.rol)} · {v.correo}{v.telefono ? ` · ${v.telefono}` : ''}</small></div>
            {v.activo === false
              ? <button className="btn btn-borde btn-chico" onClick={() => activar(v, true)}>Devolver acceso</button>
              : <button className="btn btn-rosa btn-chico" onClick={() => activar(v, false)}>Quitar</button>}
          </div>
        ))}
      </div>
      {pendientes.length > 0 && (
        <div className="panel">
          <h3>Invitaciones sin usar</h3>
          {pendientes.map((i) => (
            <div key={i.id} className="fila" style={{ justifyContent: 'space-between' }}>
              <span><b>{i.nombre}</b> <span className="suave chico">{nombreRol(i.rol)} · código {i.id}</span></span>
              <div className="fila">
                <a className="btn btn-whatsapp btn-chico" href={enlaceWhatsApp(i.telefono, textoInvitacion(i))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Reenviar</a>
                <button className="btn btn-borde btn-chico" onClick={() => cancelar(i)}>Cancelar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {nueva && <NuevaInvitacion onCerrar={() => setNueva(false)} />}
    </section>
  )
}

function NuevaInvitacion({ onCerrar }: { onCerrar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rol, setRol] = useState<'mesero' | 'cocina'>('mesero')
  const [creada, setCreada] = useState<Invitacion | null>(null)
  const [error, setError] = useState('')

  async function crear() {
    if (!nombre.trim()) { setError('Escribe el nombre.'); return }
    setError('')
    try {
      const codigo = codigoAzar()
      const inv = { nombre: nombre.trim(), telefono: telefono.trim(), rol, usada: false }
      await setDoc(doc(db, 'invitaciones', codigo), { ...inv, creada: serverTimestamp() })
      setCreada({ id: codigo, ...inv })
    } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <Hoja titulo="Invitar al equipo" onCerrar={onCerrar}>
      {!creada ? (
        <>
          <div className="campos">
            <label className="campo" htmlFor="e-nombre">Nombre *<input id="e-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" /></label>
            <label className="campo" htmlFor="e-rol">Qué hace<select id="e-rol" value={rol} onChange={(e) => setRol(e.target.value as 'mesero' | 'cocina')}>
              <option value="mesero">{T.Mesero} (pedidos y caja)</option><option value="cocina">Cocina (comandas)</option></select></label>
            <label className="campo" htmlFor="e-tel">WhatsApp<input id="e-tel" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-principal" onClick={crear}>{ICONOS.enlace}Crear invitación</button>
        </>
      ) : (
        <>
          <p className="ok">Listo. Mándale este enlace a {creada.nombre.split(' ')[0]}. Sirve una sola vez.</p>
          <div className="panel"><p className="chico" style={{ wordBreak: 'break-all' }}>{enlaceInvitacion(creada.id)}</p><p>Código: <b>{creada.id}</b></p></div>
          <a className="btn btn-whatsapp" href={enlaceWhatsApp(creada.telefono, textoInvitacion(creada))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar por WhatsApp</a>
        </>
      )}
    </Hoja>
  )
}
