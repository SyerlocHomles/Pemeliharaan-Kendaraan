'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Vehicle = {
  id: string
  name: string
  plate_number: string
  brand: string | null
  model: string | null
  manufacture_year: number | null
  vehicle_type: string | null
  status: string | null
}

const statusLabels: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  sold: 'Dijual',
}

export default function KendaraanPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')

  async function loadVehicles() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('vehicles')
      .select(
        'id, name, plate_number, brand, model, manufacture_year, vehicle_type, status'
      )
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Gagal mengambil data kendaraan: ${error.message}`)
      setLoading(false)
      return
    }

    setVehicles(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  function resetForm() {
    setName('')
    setPlateNumber('')
    setManufactureYear('')
    setBrand('')
    setModel('')
    setVehicleType('')
    setStatus('active')
    setNotes('')
  }

  function closeModal() {
    if (saving) return

    setShowModal(false)
    resetForm()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      setMessage('Nama kendaraan wajib diisi.')
      return
    }

    if (!plateNumber.trim()) {
      setMessage('Plat nomor wajib diisi.')
      return
    }

    setSaving(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Sesi login tidak ditemukan. Silakan login kembali.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('vehicles').insert({
      user_id: user.id,
      name: name.trim(),
      plate_number: plateNumber.trim().toUpperCase(),
      brand: brand.trim() || null,
      model: model.trim() || null,
      manufacture_year: manufactureYear
        ? Number(manufactureYear)
        : null,
      vehicle_type: vehicleType || null,
      status,
      notes: notes.trim() || null,
    })

    if (error) {
      setMessage(`Gagal menyimpan kendaraan: ${error.message}`)
      setSaving(false)
      return
    }

    setShowModal(false)
    resetForm()
    setSaving(false)

    await loadVehicles()

    setMessage('Kendaraan berhasil ditambahkan.')
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 pb-6 pt-20 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Kendaraan
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kelola data kendaraan yang digunakan dalam sistem
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMessage('')
              setShowModal(true)
            }}
            className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Tambah Kendaraan
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
            {message}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Kendaraan
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Plat Nomor
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Merk / Model
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tahun
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Jenis
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-gray-500"
                    >
                      Memuat data kendaraan...
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center"
                    >
                      <p className="text-sm font-medium text-gray-700">
                        Belum ada kendaraan
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        Tambahkan kendaraan pertama untuk mulai menggunakan
                        sistem.
                      </p>
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {vehicle.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {vehicle.plate_number}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {[vehicle.brand, vehicle.model]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {vehicle.manufacture_year ?? '-'}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {vehicle.vehicle_type ?? '-'}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {statusLabels[vehicle.status ?? ''] ??
                          vehicle.status ??
                          '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Tambah Kendaraan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Masukkan informasi kendaraan
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Tutup"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Area */}
            <form
  id="vehicle-form"
  onSubmit={handleSubmit}
  className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Nama Kendaraan
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Mobil Operasional 01"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="plateNumber"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Plat Nomor
                  </label>

                  <input
                    id="plateNumber"
                    type="text"
                    value={plateNumber}
                    onChange={(event) =>
                      setPlateNumber(event.target.value.toUpperCase())
                    }
                    placeholder="Contoh: L 1234 AB"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="manufactureYear"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Tahun Produksi
                  </label>

                  <input
                    id="manufactureYear"
                    type="number"
                    value={manufactureYear}
                    onChange={(event) =>
                      setManufactureYear(event.target.value)
                    }
                    placeholder="Contoh: 2024"
                    min="1900"
                    max="2100"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="brand"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Merk
                  </label>

                  <input
                    id="brand"
                    type="text"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="Contoh: Toyota"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="model"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Model
                  </label>

                  <input
                    id="model"
                    type="text"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="Contoh: Avanza"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vehicleType"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Jenis Kendaraan
                  </label>

                  <select
                    id="vehicleType"
                    value={vehicleType}
                    onChange={(event) => setVehicleType(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="">Pilih jenis kendaraan</option>
                    <option value="Mobil">Mobil</option>
                    <option value="Motor">Motor</option>
                    <option value="Truk">Truk</option>
                    <option value="Bus">Bus</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Status
                  </label>

                  <select
                    id="status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                    <option value="sold">Dijual</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="notes"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Catatan
                  </label>

                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Catatan tambahan..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                form="vehicle-form"
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
