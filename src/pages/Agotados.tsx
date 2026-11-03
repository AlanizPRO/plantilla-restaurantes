import { doc, updateDoc } from 'firebase/firestore'
import { useState } from 'react'
import { Vacio } from '../componentes'
import { mensajeError } from '../datos'
import { db } from '../firebase'
import { T } from '../textos'
import type { Contexto } from './Restaurante'

// Cualquiera del equipo marca lo que se acabó: el menú del cliente lo muestra como agotado al instante.
export default function Agotados({ ctx }: { ctx: Contexto }) {
  const [error, setError] = useState('')
  const lista = [...ctx.platos].sort((a, b) => Number(a.disponible) - Number(b.disponible) || a.nombre.localeCompare(b.nombre, 'es'))
  const cambiar = (id: string, disponible: boolean) => updateDoc(doc(db, 'platos', id), { disponible }).catch((e) => setError(mensajeError(e)))
  return (
    <section className="pantalla">
      <div><h1>Agotados</h1><p className="suave">Marca lo que se acabó hoy. En el menú del cliente sale como agotado al instante.</p></div>
      {error && <p className="error">{error}</p>}
      {lista.length === 0 && <Vacio>Todavía no hay {T.platos} en el menú.</Vacio>}
      <div className="lista">
        {lista.map((p) => (
          <div key={p.id} className="fila-item">
            {p.miniatura ? <img className="mini" src={p.miniatura} alt="" /> : null}
            <div><b>{p.nombre}</b><small>{p.disponible ? 'Hay' : 'Agotado: el cliente no lo puede pedir'}</small></div>
            <button className={`btn btn-chico ${p.disponible ? 'btn-borde' : 'btn-rosa'}`} aria-pressed={!p.disponible} onClick={() => cambiar(p.id, !p.disponible)}>
              {p.disponible ? 'Marcar agotado' : 'Ya hay'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
