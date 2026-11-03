import { useEffect, useState } from 'react'
import Actualizar from './Actualizar'
import { cliente } from './cliente'
import { mensajeError } from './datos'
import { Logo } from './componentes'
import { ICONOS } from './iconos'
import { aceptarInvitacion, entrar, invitacionGuardada, salir, useSesion } from './sesion'
import Restaurante from './pages/Restaurante'

type Tema = 'light' | 'dark'
function leerTema(): Tema {
  try { return localStorage.getItem('tema') === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

export default function App() {
  const sesion = useSesion()
  const [tema, setTema] = useState<Tema>(leerTema)

  useEffect(() => {
    document.documentElement.dataset.theme = tema
    if (tema === 'dark') document.documentElement.style.removeProperty('--fondo')
    else document.documentElement.style.setProperty('--fondo', cliente.colorFondo)
    try { localStorage.setItem('tema', tema) } catch { /* sin almacenamiento */ }
  }, [tema])

  if (sesion.rol === 'cargando') return <div className="entrada"><p className="suave">Cargando…</p><Actualizar /></div>
  if (sesion.rol === 'fuera') return <Entrada />
  if (sesion.rol === 'sin-rol') return <SinInvitacion error={sesion.errorInvitacion} correo={sesion.usuario?.email ?? ''} />

  const cambiarTema = (
    <button className="redondo" aria-label="Cambiar entre claro y oscuro" onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}>
      {tema === 'dark' ? ICONOS.sol : ICONOS.luna}
    </button>
  )
  return (
    <>
      <Restaurante usuario={sesion.usuario!} rol={sesion.rol as 'admin' | 'mesero' | 'cocina'} nombre={sesion.nombre} botonTema={cambiarTema} />
      <Actualizar />
    </>
  )
}

function Entrada() {
  const [error, setError] = useState('')
  const invitado = !!invitacionGuardada()
  return (
    <div className="entrada">
      <div className="panel">
        <Logo />
        <h1>{cliente.nombreApp}</h1>
        <p className="suave">{cliente.descripcion}{cliente.ciudad ? ` · ${cliente.ciudad}` : ''}</p>
        {invitado && <p className="ok">Tienes una invitación. Entra con tu cuenta de Google para activarla.</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn btn-principal btn-ancho" onClick={() => entrar().catch((e) => setError(mensajeError(e)))}>Entrar con Google</button>
      </div>
      <Actualizar />
    </div>
  )
}

function SinInvitacion({ error, correo }: { error: string; correo: string }) {
  const [codigo, setCodigo] = useState('')
  const [fallo, setFallo] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const ultimoError = fallo || error
  async function usar() {
    setTrabajando(true); setFallo('')
    try { await aceptarInvitacion(codigo) } catch (e) { setFallo((e as Error).message || mensajeError(e)) } finally { setTrabajando(false) }
  }
  return (
    <div className="entrada">
      <div className="panel">
        <Logo />
        <h2>Falta tu invitación</h2>
        <p className="suave">Entraste como <b>{correo}</b>. Para usar la app de {cliente.nombreApp}, el dueño te manda un enlace o un código.</p>
        {ultimoError && <p className="error">{ultimoError}</p>}
        <label className="campo" style={{ width: '100%' }} htmlFor="codigo">Código de invitación
          <input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ej. K7P2QX" autoCapitalize="characters" />
        </label>
        <button className="btn btn-principal btn-ancho" disabled={!codigo.trim() || trabajando} onClick={usar}>{trabajando ? 'Activando…' : 'Activar'}</button>
        <button className="btn btn-borde btn-ancho" onClick={salir}>Entrar con otra cuenta</button>
      </div>
    </div>
  )
}
