// Imprime solo un pedazo de la pantalla (ticket de la cuenta o comanda), sin el resto de la app.
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function useImprimir() {
  const [contenido, setContenido] = useState<ReactNode>(null)
  useEffect(() => {
    if (!contenido) return
    document.body.classList.add('imprimir-zona')
    const fin = () => { document.body.classList.remove('imprimir-zona'); setContenido(null) }
    addEventListener('afterprint', fin, { once: true })
    const t = setTimeout(() => print(), 50)
    return () => { clearTimeout(t); removeEventListener('afterprint', fin); document.body.classList.remove('imprimir-zona') }
  }, [contenido])
  const zona = contenido ? createPortal(<div className="zona-impresion">{contenido}</div>, document.body) : null
  return { imprimir: setContenido, zona }
}
