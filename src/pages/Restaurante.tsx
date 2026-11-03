import type { User } from 'firebase/auth'
import { query, where } from 'firebase/firestore'
import { useState, type ReactNode } from 'react'
import { Barra, Encabezado, type Pestana } from '../componentes'
import { tiene } from '../cliente'
import { col, todos, useAjustesConEstado, useLista, type Ajustes as TAjustes, type Categoria, type Mesa, type Pedido, type Plato } from '../datos'
import { ICONOS } from '../iconos'
import { salir } from '../sesion'
import { T } from '../textos'
import { useAvisoNuevos } from '../sonido'
import Agotados from './Agotados'
import Ajustes from './Ajustes'
import Caja from './Caja'
import Cierre from './Cierre'
import Cocina from './Cocina'
import Equipo from './Equipo'
import Mesas from './Mesas'
import MenuAdmin from './MenuAdmin'
import Pedidos from './Pedidos'

export type Rol = 'admin' | 'mesero' | 'cocina'
export type Contexto = {
  rol: Rol; admin: boolean; atiende: boolean; uid: string; nombre: string; ajustes: TAjustes; moneda: string
  categorias: Categoria[]; platos: Plato[]; mesas: Mesa[]
}
type Vista = 'pedidos' | 'cocina' | 'caja' | 'mas' | 'menu' | 'mesas' | 'cierre' | 'equipo' | 'ajustes' | 'agotados'

export default function Restaurante({ usuario, rol, nombre, botonTema }: { usuario: User; rol: Rol; nombre: string; botonTema: ReactNode }) {
  const [ajustes, ajustesListos] = useAjustesConEstado()
  const categorias = useLista<Categoria>(todos('categorias')) ?? []
  const platos = useLista<Plato>(todos('platos')) ?? []
  const mesas = (useLista<Mesa>(todos('mesas')) ?? []).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
  const conCocina = tiene('cocina')
  const [vista, setVista] = useState<Vista>(rol === 'cocina' ? 'cocina' : 'pedidos')
  const ctx: Contexto = {
    rol, admin: rol === 'admin', atiende: rol !== 'cocina', uid: usuario.uid, nombre: nombre || usuario.displayName || '',
    ajustes, moneda: ajustes.moneda, categorias, platos, mesas,
  }
  // Pedidos por aceptar: punto rojo en la pestaña y campanita para quien atiende.
  const nuevos = useLista<Pedido>(ctx.atiende ? query(col('pedidos'), where('estado', '==', 'nuevo')) : null, [ctx.atiende])
  useAvisoNuevos(nuevos ? nuevos.map((p) => p.id) : null)
  const ir = (v: Vista) => { setVista(v); scrollTo(0, 0) }

  const pestanas: Pestana[] = rol === 'cocina'
    ? [{ id: 'cocina', nombre: 'Cocina', icono: 'cocina' }, { id: 'agotados', nombre: 'Agotados', icono: 'menu' }, { id: 'mas', nombre: 'Más', icono: 'mas' }]
    : [
      { id: 'pedidos', nombre: 'Pedidos', icono: 'pedidos', punto: (nuevos?.length ?? 0) > 0 },
      ...(conCocina && rol === 'admin' ? [{ id: 'cocina', nombre: 'Cocina', icono: 'cocina' }] : []),
      { id: 'caja', nombre: 'Caja', icono: 'cobros' },
      { id: 'mas', nombre: 'Más', icono: 'mas' },
    ]
  const actual = ['menu', 'mesas', 'cierre', 'equipo', 'ajustes', ...(rol === 'cocina' ? [] : ['agotados'])].includes(vista) ? 'mas' : vista
  const subtitulo = rol === 'admin' ? 'Dueño' : rol === 'mesero' ? T.Mesero : 'Cocina'

  return (
    <div className={`app con-nav ${vista === 'cocina' ? 'ancha' : ''}`}>
      <Encabezado subtitulo={`${subtitulo}${ctx.nombre ? ` · ${ctx.nombre.split(' ')[0]}` : ''}`} derecha={botonTema} />
      {vista === 'pedidos' && <Pedidos ctx={ctx} />}
      {vista === 'cocina' && <Cocina ctx={ctx} />}
      {vista === 'caja' && <Caja ctx={ctx} />}
      {vista === 'agotados' && <Agotados ctx={ctx} />}
      {vista === 'menu' && ctx.admin && <MenuAdmin ctx={ctx} />}
      {vista === 'mesas' && ctx.admin && <Mesas ctx={ctx} />}
      {vista === 'cierre' && ctx.admin && <Cierre ctx={ctx} />}
      {vista === 'equipo' && ctx.admin && <Equipo />}
      {vista === 'ajustes' && ctx.admin && <Ajustes key={ajustesListos ? 'cargado' : 'inicial'} ajustes={ajustes} />}
      {vista === 'mas' && (
        <section className="pantalla">
          <h1>Más</h1>
          <div className="lista">
            {ctx.admin && <Opcion icono="menu" titulo="Menú" detalle={`Categorías, ${T.platos}, precios y fotos`} onClick={() => ir('menu')} />}
            {!ctx.admin && rol !== 'cocina' && <Opcion icono="menu" titulo="Agotados" detalle={`Marcar ${T.platos} que ya no hay`} onClick={() => ir('agotados')} />}
            {ctx.admin && <Opcion icono="qr" titulo={`${T.Mesas} y códigos QR`} detalle="Para que pidan desde la mesa" onClick={() => ir('mesas')} />}
            {ctx.admin && <Opcion icono="grafica" titulo="Cierre del día" detalle="Ventas, propinas y lo más vendido" onClick={() => ir('cierre')} />}
            {ctx.admin && <Opcion icono="equipo" titulo="Equipo" detalle={`Invitar ${T.meseros} y cocina`} onClick={() => ir('equipo')} />}
            {ctx.admin && <Opcion icono="ajustes" titulo="Ajustes" detalle="Nombre, WhatsApp, domicilio, propina y respaldo" onClick={() => ir('ajustes')} />}
            <Opcion icono="enlace" titulo="Ver el menú como cliente" detalle={`${location.host}/menu`} onClick={() => open('/menu', '_blank')} />
          </div>
          <p className="suave chico">Entraste como <b>{usuario.email}</b>{ctx.admin ? ' (dueño)' : ''}.</p>
          <button className="btn btn-borde" onClick={salir}>Cerrar sesión</button>
        </section>
      )}
      <Barra pestanas={pestanas} actual={actual} onIr={(v) => ir(v as Vista)} />
    </div>
  )
}

function Opcion({ icono, titulo, detalle, onClick }: { icono: string; titulo: string; detalle: string; onClick: () => void }) {
  return (
    <button className="fila-item" onClick={onClick}>
      <span className="ini" style={{ background: 'var(--principal)' }}>{ICONOS[icono]}</span>
      <div><b>{titulo}</b><small>{detalle}</small></div>
      <span aria-hidden="true">›</span>
    </button>
  )
}
