import { supabase } from './supabase'

export function fmtRupiah(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

export function fmtNumber(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return n.toLocaleString('id-ID', { maximumFractionDigits: digits })
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Tanggal lokal (WIB dll) dalam format YYYY-MM-DD. Sengaja TIDAK memakai
 * toISOString() karena itu UTC — di WIB jam 00:00–07:00 hasilnya jadi "kemarin". */
export function dateToISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return dateToISO(new Date())
}

/** Perkecil foto ke maksimal 1280px lebar & kompres ke JPEG 70% sebelum
 * diupload, supaya foto dari kamera HP (bisa beberapa MB) jadi ringan. */
export function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      img.onerror = reject
      img.onload = () => {
        const maxWidth = 1280
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas tidak didukung'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Gagal kompres gambar'))),
          'image/jpeg',
          0.7
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Upload foto bukti ke Supabase Storage (bucket "evidence") dan
 * kembalikan signed URL yang berlaku 10 tahun (praktis "permanen" untuk
 * kebutuhan pribadi, karena bucket-nya private). */
export async function uploadEvidence(file: File, folder: string): Promise<string> {
  const isImage = file.type.startsWith('image/')
  const blob = isImage ? await compressImage(file) : file
  const ext = isImage ? 'jpg' : file.name.split('.').pop() || 'bin'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: uploadError } = await supabase.storage.from('evidence').upload(path, blob, {
    contentType: isImage ? 'image/jpeg' : file.type,
  })
  if (uploadError) throw uploadError

  const { data, error: signError } = await supabase.storage
    .from('evidence')
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)
  if (signError) throw signError

  return data.signedUrl
}
