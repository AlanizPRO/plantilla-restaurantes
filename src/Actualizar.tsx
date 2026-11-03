import { useRegisterSW } from 'virtual:pwa-register/react'

// Revisa cada 30 minutos (y al volver a abrir la app) si hay una versión nueva publicada.
const CADA = 30 * 60 * 1000

export default function Actualizar() {
  const {
    needRefresh: [hayNueva, setHayNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return
      const revisar = () => { if (navigator.onLine) registro.update().catch(() => {}) }
      setInterval(revisar, CADA)
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar() })
    },
  })

  if (!hayNueva) return null
  return (
    <div className="actualizar" role="status">
      <span>Hay una versión nueva de la app</span>
      <button className="luego" onClick={() => setHayNueva(false)}>Luego</button>
      <button className="si" onClick={() => updateServiceWorker(true)}>Actualizar</button>
    </div>
  )
}
