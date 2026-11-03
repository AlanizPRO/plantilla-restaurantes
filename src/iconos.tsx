import type { ReactNode } from 'react'

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const ICONOS: Record<string, ReactNode> = {
  pedidos: <svg {...base}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>,
  cocina: <svg {...base}><path d="M6 13.5A4 4 0 0 1 7.5 6a4.5 4.5 0 0 1 9 0A4 4 0 0 1 18 13.5V20H6z" /><path d="M6 17h12" /></svg>,
  menu: <svg {...base}><path d="M7 2.5v19M4 2.5v5a3 3 0 0 0 6 0v-5M17 21.5V2.5c-2.5 1-4 4-4 8h4" /></svg>,
  qr: <svg {...base}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4" /></svg>,
  grafica: <svg {...base}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  cobros: <svg {...base}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5v5M18 9.5v5" /></svg>,
  equipo: <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.7c1.8.8 3 2.6 3.5 5.3" /></svg>,
  mas: <svg {...base}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>,
  ajustes: <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>,
  whatsapp: <svg {...base}><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1 1.8.8c-.2 1-1 1.7-2 1.7C11 15.5 8.5 13 8.5 10.2c0-1 .7-1.8 1.7-2l.8 1.8z" /></svg>,
  sol: <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  luna: <svg {...base}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>,
  enlace: <svg {...base}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
  camara: <svg {...base}><path d="M4 7h3l2-2.5h6L17 7h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  imprimir: <svg {...base}><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>,
  moto: <svg {...base}><circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M8.5 17h6l2-6h-4M14 6h3l1.5 5" /></svg>,
}
