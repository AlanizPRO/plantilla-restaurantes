// Prepara la app con los datos de src/cliente.json antes de compilar o publicar:
// - revisa que la configuración esté completa
// - escribe firestore.rules con el correo del dueño
import { readFileSync, writeFileSync } from 'node:fs'

const cliente = JSON.parse(readFileSync(new URL('../src/cliente.json', import.meta.url), 'utf8'))
const correo = String(cliente.correoAdmin ?? '').trim().toLowerCase()
const problemas = []
if (!/^[^@\s'"\\]+@[^@\s'"\\]+\.[a-z]{2,}$/.test(correo)) problemas.push('correoAdmin no es un correo válido')
if (!cliente.nombreApp) problemas.push('falta nombreApp')
if (!cliente.firebase?.projectId) problemas.push('falta firebase.projectId')
if (problemas.length) {
  console.error(`src/cliente.json: ${problemas.join('; ')}`)
  process.exit(1)
}
const reglas = readFileSync(new URL('../firestore.plantilla.rules', import.meta.url), 'utf8').replaceAll('__CORREO_ADMIN__', correo)
writeFileSync(new URL('../firestore.rules', import.meta.url), reglas)
console.log(`Listo: ${cliente.nombreApp} (${cliente.firebase.projectId}), administrador ${correo}`)
