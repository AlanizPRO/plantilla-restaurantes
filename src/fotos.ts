// Achica las fotos en el teléfono antes de guardarlas. Así caben en la base de datos del plan gratis (Spark),
// sin pagar almacenamiento: foto grande ~120 KB y miniatura ~10 KB.

function cargar(archivo: File): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); ok(img) }
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No pude abrir esa foto.')) }
    img.src = url
  })
}

function dibujar(img: HTMLImageElement, lado: number, cuadrada: boolean) {
  const lienzo = document.createElement('canvas')
  const escala = Math.min(1, lado / Math.max(img.width, img.height))
  if (cuadrada) {
    const s = Math.min(img.width, img.height)
    lienzo.width = lienzo.height = Math.min(lado, s)
    lienzo.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lienzo.width, lienzo.height)
  } else {
    lienzo.width = Math.round(img.width * escala)
    lienzo.height = Math.round(img.height * escala)
    lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height)
  }
  return lienzo
}

// Baja la calidad hasta que la foto pese menos del máximo.
function comprimir(lienzo: HTMLCanvasElement, maxBytes: number) {
  let calidad = 0.82
  let datos = lienzo.toDataURL('image/jpeg', calidad)
  while (datos.length * 0.75 > maxBytes && calidad > 0.35) {
    calidad -= 0.08
    datos = lienzo.toDataURL('image/jpeg', calidad)
  }
  return datos
}

export async function prepararFoto(archivo: File) {
  const img = await cargar(archivo)
  return {
    grande: comprimir(dibujar(img, 1100, false), 150_000),
    miniatura: comprimir(dibujar(img, 220, true), 14_000),
  }
}
