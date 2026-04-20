'use client'

/**
 * Comprime una imagen en el cliente usando Canvas.
 * Devuelve un data URL JPEG con max 1280px en el lado más largo.
 */
export function compressImage(file: File, maxPx = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const { width, height } = img
        const scale = Math.min(1, maxPx / Math.max(width, height))
        const w = Math.round(width * scale)
        const h = Math.round(height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
