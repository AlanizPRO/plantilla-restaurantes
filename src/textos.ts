// Palabras de cada negocio: "plato / mesero / mesa", "producto / cajero / mesa"…
// Las escribe la Super App en src/cliente.json → "textos".
import { cliente } from './cliente'

const BASE = { plato: 'plato', platos: 'platos', mesero: 'mesero', meseros: 'meseros', mesa: 'mesa', mesas: 'mesas' }
const t = { ...BASE, ...((cliente as { textos?: Partial<typeof BASE> }).textos ?? {}) }
const may = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export const T = {
  ...t,
  Plato: may(t.plato), Platos: may(t.platos),
  Mesero: may(t.mesero), Meseros: may(t.meseros),
  Mesa: may(t.mesa), Mesas: may(t.mesas),
}
