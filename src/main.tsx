import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import App from './App'
import MenuPublico from './publico/MenuPublico'
import MiPedido from './publico/MiPedido'
import { prepararSonido } from './sonido'
import { cliente } from './cliente'
import { guardarInvitacionDeLaUrl } from './sesion'

// Colores de este restaurante (desde src/cliente.json).
const raiz = document.documentElement.style
raiz.setProperty('--principal', cliente.colorPrincipal)
raiz.setProperty('--acento', cliente.colorAcento)
raiz.setProperty('--fondo', cliente.colorFondo)

// Enlaces para clientes (sin entrar con Google): /menu, /m/ID_DE_MESA (QR de la mesa) y /p/CODIGO (su pedido).
const [, tipo, codigo] = location.pathname.split('/')
const pagina = tipo === 'menu' ? <MenuPublico />
  : tipo === 'm' && codigo ? <MenuPublico mesaId={codigo} />
  : tipo === 'p' && codigo ? <MiPedido codigo={codigo} />
  : <App />
if (pagina.type === App) { guardarInvitacionDeLaUrl(); prepararSonido() }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pagina}
  </StrictMode>,
)
