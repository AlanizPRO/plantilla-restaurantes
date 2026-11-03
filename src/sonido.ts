// Campanita cuando entra un pedido nuevo (solo si la app está abierta).
import { useEffect, useRef } from 'react'

let contexto: AudioContext | null = null
export function sonar() {
  try {
    contexto ??= new AudioContext()
    const t = contexto.currentTime
    for (const [i, f] of [880, 1320].entries()) {
      const o = contexto.createOscillator(); const g = contexto.createGain()
      o.frequency.value = f; o.type = 'sine'
      g.gain.setValueAtTime(0.0001, t + i * 0.18); g.gain.exponentialRampToValueAtTime(0.35, t + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.4)
      o.connect(g).connect(contexto.destination); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.45)
    }
  } catch { /* sin sonido */ }
}
// Safari solo deja sonar después de que la persona toque la pantalla una vez.
export function prepararSonido() {
  const activar = () => { try { contexto ??= new AudioContext(); void contexto.resume() } catch { /* sin sonido */ } }
  addEventListener('pointerdown', activar, { once: true })
}

/** Suena cuando aparece un id que no estaba antes en la lista (no al abrir la app). */
export function useAvisoNuevos(ids: string[] | null) {
  const vistos = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!ids) return
    if (vistos.current && ids.some((id) => !vistos.current!.has(id))) sonar()
    vistos.current = new Set(ids)
  }, [ids])
}
