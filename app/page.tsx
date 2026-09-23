'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [vehicleCount, setVehicleCount] = useState<number | null>(null)
  const [message, setMessage] = useState('Memeriksa login...')

  async function loadDashboard() {
    const { data: userData, error: userError } =
      await supabase.auth.getUser()

    if (userError || !userData.user) {
      setUserEmail(null)
      setMessage('Belum login.')
      return
    }

    setUserEmail(userData.user.email ?? null)

    const { data, error } = await supabase
      .from('vehicles')
      .select('id')

    if (error) {
      setMessage(`Database gagal diakses: ${error.message}`)
      return
    }

    setVehicleCount(data.length)
    setMessage('Database berhasil diakses.')
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUserEmail(null)
    setVehicleCount(null)
    setMessage('Berhasil logout.')
  }

  if (!userEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Pemeliharaan Kendaraan
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Silakan login terlebih dahulu.
          </p>

          <p className="mt-4 text-sm text-gray-600">
            {message}
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Dashboard
            </h2>

            <p className="text-sm text-gray-500">
              Ringkasan pemeliharaan kendaraan
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {userEmail}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Kendaraan
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {vehicleCount ?? '-'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                BBM Bulan Ini
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                0
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Service Bulan Ini
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                0
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Maintenance Bulan Ini
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                0
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">
              Status Sistem
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              {message}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

              <span className="text-sm font-medium text-green-700">
                Database terhubung
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}