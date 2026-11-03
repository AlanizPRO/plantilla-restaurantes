import { addDoc, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import { col, dinero, mensajeError, type Categoria, type Plato } from '../datos'
import { db } from '../firebase'
import { prepararFoto } from '../fotos'
import { ICONOS } from '../iconos'
import { T } from '../textos'
import type { Contexto } from './Restaurante'

// El dueño arma el menú: categorías (Entradas, Platos fuertes, Bebidas…) y sus platos con foto y precio.
export default function MenuAdmin({ ctx }: { ctx: Contexto }) {
  const cats = [...ctx.categorias].sort((a, b) => a.orden - b.orden)
  const [editar, setEditar] = useState<Plato | 'nuevo' | null>(null)
  const [nuevaCat, setNuevaCat] = useState('')
  const [error, setError] = useState('')
  const hacer = (f: () => Promise<unknown>) => { setError(''); f().catch((e) => setError(mensajeError(e))) }

  async function agregarCategoria() {
    const nombre = nuevaCat.trim(); if (!nombre) return
    setNuevaCat('')
    await addDoc(col('categorias'), { nombre, orden: (cats[cats.length - 1]?.orden ?? 0) + 1 })
  }
  // Sube o baja una categoría o un plato intercambiando su "orden" con el vecino.
  async function mover<X extends { id: string; orden: number }>(coleccion: string, lista: X[], i: number, paso: number) {
    const j = i + paso; if (j < 0 || j >= lista.length) return
    const lote = writeBatch(db)
    lista.forEach((x, n) => {
      const orden = n === i ? j : n === j ? i : n
      if (x.orden !== orden) lote.update(doc(db, coleccion, x.id), { orden })
    })
    await lote.commit()
  }
  async function renombrar(c: Categoria) {
    const nombre = prompt('Nuevo nombre de la categoría', c.nombre)?.trim()
    if (nombre && nombre !== c.nombre) await updateDoc(doc(db, 'categorias', c.id), { nombre })
  }
  async function borrarCategoria(c: Categoria) {
    if (ctx.platos.some((p) => p.categoriaId === c.id)) { setError(`Primero mueve o borra los ${T.platos} de "${c.nombre}".`); return }
    if (confirm(`¿Borrar la categoría "${c.nombre}"?`)) await deleteDoc(doc(db, 'categorias', c.id))
  }

  const grupos = [...cats.map((c) => ({ c, lista: ctx.platos.filter((p) => p.categoriaId === c.id) })),
    { c: null, lista: ctx.platos.filter((p) => !cats.some((c) => c.id === p.categoriaId)) }]
    .map((g) => ({ ...g, lista: [...g.lista].sort((a, b) => a.orden - b.orden) }))

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>Menú</h1><p className="suave">{ctx.platos.length} {T.platos} en {cats.length} categoría{cats.length === 1 ? '' : 's'}</p></div>
        <button className="btn btn-principal" onClick={() => setEditar('nuevo')}>+ {T.Plato}</button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <h3>Categorías</h3>
        {cats.length === 0 && <p className="suave chico">Ej. Desayunos, Platos fuertes, Bebidas, Postres.</p>}
        {cats.map((c, i) => (
          <div key={c.id} className="fila" style={{ justifyContent: 'space-between' }}>
            <b>{c.nombre}</b>
            <div className="fila">
              <button className="btn btn-borde btn-chico" aria-label="Subir" disabled={i === 0} onClick={() => hacer(() => mover('categorias', cats, i, -1))}>↑</button>
              <button className="btn btn-borde btn-chico" aria-label="Bajar" disabled={i === cats.length - 1} onClick={() => hacer(() => mover('categorias', cats, i, 1))}>↓</button>
              <button className="btn btn-borde btn-chico" onClick={() => hacer(() => renombrar(c))}>Renombrar</button>
              <button className="btn btn-rosa btn-chico" aria-label={`Borrar ${c.nombre}`} onClick={() => hacer(() => borrarCategoria(c))}>×</button>
            </div>
          </div>
        ))}
        <form className="fila" onSubmit={(e) => { e.preventDefault(); hacer(agregarCategoria) }}>
          <label className="campo" htmlFor="m-cat" style={{ flex: 1 }}><span hidden>Nueva categoría</span><input id="m-cat" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="Nueva categoría" /></label>
          <button className="btn btn-borde" type="submit">Agregar</button>
        </form>
      </div>
      {ctx.platos.length === 0 && <Vacio>Todavía no hay {T.platos}. Crea las categorías y luego toca "+ {T.Plato}".</Vacio>}
      {grupos.filter((g) => g.lista.length).map(({ c, lista }) => (
        <div key={c?.id ?? 'sin'} className="pantalla" style={{ gap: 8 }}>
          <div className="etiqueta">{c?.nombre ?? 'Sin categoría'}</div>
          {lista.map((p, i) => (
            <div key={p.id} className="fila-item">
              {p.miniatura ? <img className="mini" src={p.miniatura} alt="" /> : <span className="ini">{ICONOS.menu}</span>}
              <button style={{ flex: 1, minWidth: 0, border: 0, background: 'none', color: 'var(--fg)', textAlign: 'left', padding: 0 }} onClick={() => setEditar(p)}>
                <b>{p.nombre}</b><small>{dinero(p.precio, ctx.moneda)}{p.disponible ? '' : ' · agotado'}</small>
              </button>
              <button className="btn btn-borde btn-chico" aria-label="Subir" disabled={i === 0} onClick={() => hacer(() => mover('platos', lista, i, -1))}>↑</button>
              <button className="btn btn-borde btn-chico" aria-label="Bajar" disabled={i === lista.length - 1} onClick={() => hacer(() => mover('platos', lista, i, 1))}>↓</button>
            </div>
          ))}
        </div>
      ))}
      {editar && <FormPlato ctx={ctx} plato={editar === 'nuevo' ? null : editar} onCerrar={() => setEditar(null)} />}
    </section>
  )
}

function FormPlato({ ctx, plato, onCerrar }: { ctx: Contexto; plato: Plato | null; onCerrar: () => void }) {
  const cats = [...ctx.categorias].sort((a, b) => a.orden - b.orden)
  const [f, setF] = useState({
    nombre: plato?.nombre ?? '', descripcion: plato?.descripcion ?? '', precio: plato ? String(plato.precio) : '',
    categoriaId: plato?.categoriaId ?? cats[0]?.id ?? '', disponible: plato?.disponible ?? true,
  })
  const [foto, setFoto] = useState<{ grande: string; miniatura: string } | null>(null)
  const [quitarFoto, setQuitarFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const miniatura = foto?.miniatura ?? (quitarFoto ? '' : plato?.miniatura ?? '')

  async function elegirFoto(archivo?: File) {
    if (!archivo) return
    try { setFoto(await prepararFoto(archivo)); setQuitarFoto(false) } catch (e) { setError((e as Error).message) }
  }
  async function guardar() {
    const precio = Number(f.precio)
    if (!f.nombre.trim()) { setError('Escribe el nombre.'); return }
    if (!(precio >= 0) || f.precio === '') { setError('Escribe el precio.'); return }
    setGuardando(true); setError('')
    try {
      const ref = plato ? doc(db, 'platos', plato.id) : doc(col('platos'))
      const enCat = ctx.platos.filter((p) => p.categoriaId === f.categoriaId)
      const datos: Omit<Plato, 'id'> = {
        nombre: f.nombre.trim().slice(0, 100), descripcion: f.descripcion.trim().slice(0, 300), precio, categoriaId: f.categoriaId,
        disponible: f.disponible, miniatura, conFoto: !!miniatura,
        orden: plato && plato.categoriaId === f.categoriaId ? plato.orden : enCat.reduce((m, p) => Math.max(m, p.orden + 1), 0),
      }
      // La foto grande va aparte, así el menú carga rápido con las miniaturas.
      if (foto) await setDoc(doc(db, 'fotos', ref.id), { datos: foto.grande, creada: serverTimestamp() })
      if (quitarFoto && plato?.conFoto) await deleteDoc(doc(db, 'fotos', ref.id))
      await setDoc(ref, datos)
      onCerrar()
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }
  async function borrar() {
    if (!plato || !confirm(`¿Borrar "${plato.nombre}" del menú?`)) return
    try { await deleteDoc(doc(db, 'platos', plato.id)); if (plato.conFoto) await deleteDoc(doc(db, 'fotos', plato.id)); onCerrar() } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <Hoja titulo={plato ? `Editar ${T.plato}` : `Nuevo ${T.plato}`} onCerrar={onCerrar}>
      <div className="fotos-form">
        {miniatura ? <div className="foto-mini"><img src={miniatura} alt="" /><button aria-label="Quitar foto" onClick={() => { setFoto(null); setQuitarFoto(true) }}>×</button></div> : null}
        <label className="foto-mini agregar" htmlFor="pl-foto">{ICONOS.camara}{miniatura ? 'Cambiar' : 'Foto'}
          <input id="pl-foto" type="file" accept="image/*" hidden onChange={(e) => elegirFoto(e.target.files?.[0])} /></label>
      </div>
      <div className="campos">
        <label className="campo" htmlFor="pl-nombre">Nombre *<input id="pl-nombre" value={f.nombre} onChange={(e) => setF((x) => ({ ...x, nombre: e.target.value }))} placeholder="Ej. Gallo pinto con huevo" /></label>
        <label className="campo" htmlFor="pl-precio">Precio ({ctx.moneda}) *<input id="pl-precio" type="number" inputMode="decimal" value={f.precio} onChange={(e) => setF((x) => ({ ...x, precio: e.target.value }))} /></label>
        <label className="campo" htmlFor="pl-cat">Categoría<select id="pl-cat" value={f.categoriaId} onChange={(e) => setF((x) => ({ ...x, categoriaId: e.target.value }))}>
          {cats.length === 0 && <option value="">Sin categoría</option>}
          {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select></label>
      </div>
      <label className="campo" htmlFor="pl-desc">Descripción<textarea id="pl-desc" value={f.descripcion} maxLength={300} onChange={(e) => setF((x) => ({ ...x, descripcion: e.target.value }))} placeholder="Qué lleva, tamaño, para cuántas personas…" /></label>
      <label className="check"><input type="checkbox" checked={f.disponible} onChange={(e) => setF((x) => ({ ...x, disponible: e.target.checked }))} />Hay hoy (si lo quitas, sale como agotado)</label>
      {error && <p className="error">{error}</p>}
      <div className="fila">
        <button className="btn btn-principal" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        {plato && <button className="btn btn-rosa" onClick={borrar}>Borrar</button>}
      </div>
    </Hoja>
  )
}
