import { query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Vacio } from '../componentes'
import { col, etiquetaPedido, hora, mensajeError, NOMBRE_TIPO, useLista, type Pedido } from '../datos'
import { cambiarEstado } from '../pedidos'
import { useAvisoNuevos } from '../sonido'
import type { Contexto } from './Restaurante'

const desde = (p: Pedido) => p.tiempos?.aceptado ?? p.creado?.toMillis() ?? Date.now()
const TARDE = 20 // minutos

// Pantalla de comandas: lo que entra a la cocina, por orden de llegada.
export default function Cocina({ ctx }: { ctx: Contexto }) {
  const lista = (useLista<Pedido>(query(col('pedidos'), where('estado', 'in', ['aceptado', 'preparando']))) ?? []).sort((a, b) => desde(a) - desde(b))
  const [, setReloj] = useState(0)
  const [error, setError] = useState('')
  useAvisoNuevos(lista.map((p) => `${p.id}:${p.items.length}`))
  useEffect(() => { const t = setInterval(() => setReloj((n) => n + 1), 30000); return () => clearInterval(t) }, [])
  const mover = (p: Pedido, e: 'preparando' | 'listo') => { setError(''); cambiarEstado(p, e).catch((x) => setError(mensajeError(x))) }

  return (
    <section className="pantalla">
      <div><h1>Cocina</h1><p className="suave">{lista.length ? `${lista.length} por sacar · suena una campanita cuando entra uno nuevo` : 'Todo al día'}</p></div>
      {error && <p className="error">{error}</p>}
      {lista.length === 0 && <Vacio>No hay comandas. Aquí aparecen los pedidos apenas los acepta {ctx.rol === 'cocina' ? 'el mesero' : 'alguien del equipo'}.</Vacio>}
      <div className="comandas">
        {lista.map((p) => {
          const min = Math.floor((Date.now() - desde(p)) / 60000)
          return (
            <div key={p.id} className={`comanda ${p.estado === 'preparando' ? 'preparando' : ''} ${min >= TARDE ? 'tarde' : ''}`}>
              <div className="fila" style={{ justifyContent: 'space-between' }}>
                <h2>{p.tipo === 'mesa' ? p.mesaNombre : NOMBRE_TIPO[p.tipo]}</h2>
                <span className={`pill ${min >= TARDE ? 'p-rosa' : 'p-gris'}`}>{min} min</span>
              </div>
              {p.tipo !== 'mesa' && <small className="suave">{etiquetaPedido(p)}</small>}
              <ul>
                {p.items.map((i, n) => <li key={n}><b>{i.cantidad}</b>{i.nombre}{i.nota && <span className="nota">{i.nota}</span>}</li>)}
              </ul>
              {p.nota && <p className="nota" style={{ color: 'var(--rosa)', fontWeight: 800 }}>{p.nota}</p>}
              <small className="suave">Entró {hora(new Date(desde(p)))}{p.por ? ` · ${p.por}` : ''}</small>
              {p.estado === 'aceptado'
                ? <button className="btn btn-borde" onClick={() => mover(p, 'preparando')}>Empezar</button>
                : <button className="btn btn-principal" onClick={() => mover(p, 'listo')}>Listo ✓</button>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
