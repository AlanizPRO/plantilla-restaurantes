import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { correoAdmin } from './cliente'
import { auth, db, google } from './firebase'

export type Rol = 'cargando' | 'fuera' | 'admin' | 'mesero' | 'cocina' | 'sin-rol'
export type Sesion = { rol: Rol; usuario: User | null }

const CLAVE = 'invitacion'

// Si la app se abrió con un enlace de invitación (?i=CODIGO), lo guardamos hasta que la persona entre.
export function guardarInvitacionDeLaUrl() {
  const url = new URL(location.href)
  const codigo = url.searchParams.get('i')
  if (!codigo) return
  try { localStorage.setItem(CLAVE, codigo.trim().toUpperCase()) } catch { /* sin almacenamiento */ }
  url.searchParams.delete('i')
  history.replaceState(null, '', url.pathname + url.search + url.hash)
}
export function invitacionGuardada() {
  try { return localStorage.getItem(CLAVE) ?? '' } catch { return '' }
}
function olvidarInvitacion() {
  try { localStorage.removeItem(CLAVE) } catch { /* sin almacenamiento */ }
}

export async function entrar() {
  try {
    await signInWithPopup(auth, google)
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? ''
    if (codigo.includes('popup-blocked') || codigo.includes('operation-not-supported')) await signInWithRedirect(auth, google)
    else throw e
  }
}
export const salir = () => signOut(auth)

// Vincula la cuenta de Google del mesero o la cocina usando el código de invitación.
export async function aceptarInvitacion(codigoTexto: string) {
  const u = auth.currentUser
  if (!u) throw new Error('Primero entra con Google.')
  const codigo = codigoTexto.trim().toUpperCase()
  const inv = await getDoc(doc(db, 'invitaciones', codigo))
  if (!inv.exists()) throw new Error('Ese código no existe. Revisa que esté bien escrito.')
  const { usada, nombre, telefono, rol } = inv.data() as { usada: boolean; nombre?: string; telefono?: string; rol?: string }
  if (usada) throw new Error('Esa invitación ya se usó. Pide una nueva al dueño.')
  const lote = writeBatch(db)
  lote.set(doc(db, 'usuarios', u.uid), { rol: rol === 'cocina' ? 'cocina' : 'mesero', codigo, nombre: nombre || u.displayName || '', correo: u.email ?? '', telefono: telefono ?? '', activo: true })
  lote.update(doc(db, 'invitaciones', codigo), { usada: true, uid: u.uid })
  await lote.commit()
  olvidarInvitacion()
}

export type Perfil = { rol: 'mesero' | 'cocina'; nombre: string; telefono?: string; activo?: boolean }

export function useSesion(): Sesion & { errorInvitacion: string; nombre: string; telefono: string } {
  const [usuario, setUsuario] = useState<User | null | undefined>(undefined)
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)
  const [errorInvitacion, setErrorInvitacion] = useState('')

  useEffect(() => onAuthStateChanged(auth, setUsuario), [])

  const esAdmin = !!usuario && usuario.emailVerified && (usuario.email ?? '').toLowerCase() === correoAdmin

  useEffect(() => {
    if (!usuario || esAdmin) { setPerfil(undefined); return }
    // Ignoramos lo que aún no confirmó el servidor: si no, se pedirían datos antes de que la invitación quede guardada.
    return onSnapshot(doc(db, 'usuarios', usuario.uid), { includeMetadataChanges: true }, (s) => {
      if (s.metadata.hasPendingWrites) return
      setPerfil(s.exists() ? (s.data() as Perfil) : null)
    }, () => setPerfil(null))
  }, [usuario, esAdmin])

  // Persona nueva que llegó con un enlace: lo vinculamos solo.
  useEffect(() => {
    if (!usuario || esAdmin || perfil !== null) return
    const codigo = invitacionGuardada()
    if (!codigo) return
    aceptarInvitacion(codigo).catch((e: Error) => { olvidarInvitacion(); setErrorInvitacion(e.message) })
  }, [usuario, esAdmin, perfil])

  const nombre = perfil?.nombre || usuario?.displayName || ''
  const telefono = perfil?.telefono ?? ''
  if (usuario === undefined) return { rol: 'cargando', usuario: null, errorInvitacion, nombre, telefono }
  if (!usuario) return { rol: 'fuera', usuario: null, errorInvitacion, nombre, telefono }
  if (esAdmin) return { rol: 'admin', usuario, errorInvitacion, nombre, telefono }
  if (perfil === undefined) return { rol: 'cargando', usuario, errorInvitacion, nombre, telefono }
  if ((perfil?.rol === 'mesero' || perfil?.rol === 'cocina') && perfil.activo !== false) return { rol: perfil.rol, usuario, errorInvitacion, nombre, telefono }
  return { rol: 'sin-rol', usuario, errorInvitacion, nombre, telefono }
}
