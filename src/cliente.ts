// Datos de este restaurante. Los escribe la Super App en src/cliente.json.
import datos from './cliente.json'

export type Modulo = 'menu' | 'pedidos' | 'caja' | 'enlinea' | 'cocina'

export const cliente = datos
export const correoAdmin = datos.correoAdmin.trim().toLowerCase()
export const tiene = (m: Modulo) => (datos.modulos as string[]).includes(m)
