'use client'

import { useEffect, useState } from 'react'
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

export default function KendaraanPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)

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

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
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
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Tambah Kendaraan
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
                        Tambahkan kendaraan pertama untuk mulai menggunakan sistem.
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
                        {vehicle.status ?? '-'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
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
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form className="p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Nama Kendaraan
                  </label>

                  <input
                    type="text"
                    placeholder="Contoh: Mobil Operasional 01"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Plat Nomor
                  </label>

                  <input
                    type="text"
                    placeholder="Contoh: L 1234 AB"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tahun Produksi
                  </label>

                  <input
                    type="number"
                    placeholder="Contoh: 2024"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Merk
                  </label>

                  <input
                    type="text"
                    placeholder="Contoh: Toyota"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Model
                  </label>

                  <input
                    type="text"
                    placeholder="Contoh: Avanza"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Jenis Kendaraan
                  </label>

                  <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
                    <option value="">Pilih jenis kendaraan</option>
                    <option value="Mobil">Mobil</option>
                    <option value="Motor">Motor</option>
                    <option value="Truk">Truk</option>
                    <option value="Bus">Bus</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Dijual">Dijual</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Catatan
                  </label>

                  <textarea
                    rows={3}
                    placeholder="Catatan tambahan..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}