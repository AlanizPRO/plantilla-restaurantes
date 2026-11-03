import { useState } from 'react'
import { descargarRespaldo, type Hoja } from '../respaldo'

// Botón de Ajustes: baja un Excel con todos los datos de la app.
export default function BotonRespaldo({ hojas }: { hojas: Hoja[] }) {
  const [estado, setEstado] = useState<'' | 'bajando' | 'listo' | 'error'>('')
  async function bajar() {
    setEstado('bajando')
    try { await descargarRespaldo(hojas); setEstado('listo') } catch (e) { console.error(e); setEstado('error') }
  }
  return (
    <div className="panel">
      <h3>Respaldo</h3>
      <p className="suave chico">Baja un archivo de Excel con todos tus datos. Guárdalo de vez en cuando, por seguridad.</p>
      {estado === 'listo' && <p className="ok">Listo, revisa tus descargas.</p>}
      {estado === 'error' && <p className="error">No se pudo armar el respaldo. Revisa tu conexión e intenta de nuevo.</p>}
      <button className="btn btn-borde" disabled={estado === 'bajando'} onClick={bajar}>{estado === 'bajando' ? 'Armando el archivo…' : 'Descargar respaldo en Excel'}</button>
    </div>
  )
}
