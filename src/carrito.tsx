// Menú para escoger platos con + y −. Lo usan el mesero (al tomar un pedido) y el cliente (en el menú público).
import { useMemo, useState } from 'react'
import { dinero, normal, type Categoria, type Item, type Plato } from './datos'
import { T } from './textos'

export function useCarrito() {
  const [items, setItems] = useState<Item[]>([])
  const cantidad = (platoId: string) => items.filter((i) => i.platoId === platoId).reduce((s, i) => s + i.cantidad, 0)
  function sumar(p: Plato, n: number) {
    setItems((lista) => {
      const i = lista.findIndex((x) => x.platoId === p.id && !x.nota)
      if (i < 0) return n > 0 ? [...lista, { platoId: p.id, nombre: p.nombre, precio: p.precio, cantidad: n, nota: '' }] : lista
      const nueva = [...lista]; nueva[i] = { ...nueva[i], cantidad: nueva[i].cantidad + n }
      return nueva.filter((x) => x.cantidad > 0)
    })
  }
  const cambiar = (i: number, cambios: Partial<Item>) => setItems((l) => l.map((x, n) => (n === i ? { ...x, ...cambios } : x)).filter((x) => x.cantidad > 0))
  return { items, setItems, cantidad, sumar, cambiar, vaciar: () => setItems([]) }
}
export type Carrito = ReturnType<typeof useCarrito>

export function ListaMenu({ categorias, platos, carrito, moneda, puedePedir = true, onFoto }: {
  categorias: Categoria[]; platos: Plato[]; carrito: Carrito; moneda: string; puedePedir?: boolean; onFoto?: (p: Plato) => void
}) {
  const [cat, setCat] = useState('')
  const [buscar, setBuscar] = useState('')
  const grupos = useMemo(() => {
    const b = normal(buscar.trim())
    const visibles = platos.filter((p) => (!b || normal(`${p.nombre} ${p.descripcion}`).includes(b)))
    const conCat = [...categorias].sort((a, c) => a.orden - c.orden).map((c) => ({ c, lista: visibles.filter((p) => p.categoriaId === c.id).sort((a, x) => a.orden - x.orden) }))
    const sueltos = visibles.filter((p) => !categorias.some((c) => c.id === p.categoriaId))
    if (sueltos.length) conCat.push({ c: { id: '', nombre: 'Otros', orden: 999 }, lista: sueltos })
    return conCat.filter((g) => g.lista.length && (!cat || g.c.id === cat))
  }, [categorias, platos, buscar, cat])

  return (
    <div className="pantalla">
      {platos.length > 8 && <label className="campo" htmlFor="buscar-plato"><span hidden>Buscar</span>
        <input id="buscar-plato" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder={`Buscar ${T.plato}…`} /></label>}
      {categorias.length > 1 && (
        <div className="tabs" role="tablist" aria-label="Categorías">
          <button className="tab" role="tab" aria-selected={!cat} onClick={() => setCat('')}>Todo</button>
          {[...categorias].sort((a, c) => a.orden - c.orden).map((c) => (
            <button key={c.id} className="tab" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)}>{c.nombre}</button>
          ))}
        </div>
      )}
      {grupos.map(({ c, lista }) => (
        <div key={c.id || 'otros'} className="pantalla" style={{ gap: 8 }}>
          {categorias.length > 0 && <div className="etiqueta">{c.nombre}</div>}
          {lista.map((p) => {
            const n = carrito.cantidad(p.id)
            return (
              <div key={p.id} className={`plato ${p.disponible ? '' : 'agotado'}`}>
                {p.miniatura
                  ? <button className="plato-foto" aria-label={`Ver foto de ${p.nombre}`} onClick={() => onFoto?.(p)} disabled={!onFoto || !p.conFoto}><img src={p.miniatura} alt="" /></button>
                  : null}
                <div className="plato-txt">
                  <b>{p.nombre}</b>
                  {p.descripcion && <small>{p.descripcion}</small>}
                  <span className="precio">{dinero(p.precio, moneda)}{!p.disponible && <span className="pill p-gris" style={{ marginLeft: 8 }}>Agotado</span>}</span>
                </div>
                {puedePedir && p.disponible && (
                  n === 0
                    ? <button className="btn btn-principal btn-chico" onClick={() => carrito.sumar(p, 1)} aria-label={`Agregar ${p.nombre}`}>Agregar</button>
                    : <div className="contador">
                      <button aria-label={`Quitar un ${p.nombre}`} onClick={() => carrito.sumar(p, -1)}>−</button>
                      <b aria-live="polite">{n}</b>
                      <button aria-label={`Agregar otro ${p.nombre}`} onClick={() => carrito.sumar(p, 1)}>+</button>
                    </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
      {grupos.length === 0 && <p className="suave">{platos.length ? 'No encontré nada con ese nombre.' : `Todavía no hay ${T.platos} en el menú.`}</p>}
    </div>
  )
}

/** Lista de lo escogido, con nota por plato ("sin cebolla") y cantidades. */
export function ResumenCarrito({ carrito, moneda }: { carrito: Carrito; moneda: string }) {
  return (
    <div className="lista">
      {carrito.items.map((i, n) => (
        <div key={`${i.platoId}-${n}`} className="linea-item">
          <div className="contador chico">
            <button aria-label="Uno menos" onClick={() => carrito.cambiar(n, { cantidad: i.cantidad - 1 })}>−</button>
            <b>{i.cantidad}</b>
            <button aria-label="Uno más" onClick={() => carrito.cambiar(n, { cantidad: i.cantidad + 1 })}>+</button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{i.nombre}</b>
            <input className="nota-item" value={i.nota} maxLength={200} onChange={(e) => carrito.cambiar(n, { nota: e.target.value })} placeholder="Nota (ej. sin cebolla)" aria-label={`Nota para ${i.nombre}`} />
          </div>
          <b>{dinero(i.precio * i.cantidad, moneda)}</b>
        </div>
      ))}
    </div>
  )
}
