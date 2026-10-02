'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useVehicles } from '@/lib/hooks'
import { fmtRupiah } from '@/lib/utils'
import { kmStatus, dateStatus } from '@/lib/reminders'
import { PageShell, VehicleSelect } from '@/components/ui'
import type { FuelLog, MaintenanceSchedule, MaintenanceType, ServiceLog, TaxReminder } from '@/lib/types'

export default function Home() {
  const [session, setSession] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === null) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">Memeriksa login...</div>
  }
  if (!session) return <LoginScreen />
  return <Dashboard />
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah.')
      setLoading(false)
      return
    }
    setPassword('')
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Pemeliharaan Kendaraan</h1>
          <p className="mt-2 text-sm text-gray-500">Silakan login untuk melanjutkan.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200" />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Dashboard() {
  const { vehicles, vehicleId, setVehicleId } = useVehicles()
  const [fuel, setFuel] = useState<FuelLog[]>([])
  const [service, setService] = useState<ServiceLog[]>([])
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [types, setTypes] = useState<MaintenanceType[]>([])
  const [taxes, setTaxes] = useState<TaxReminder[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    const [f, s, m, t, tx] = await Promise.all([
      supabase.from('fuel_logs').select('*').eq('vehicle_id', vehicleId),
      supabase.from('service_logs').select('*').eq('vehicle_id', vehicleId),
      supabase.from('maintenance_schedules').select('*').eq('vehicle_id', vehicleId),
      supabase.from('maintenance_types').select('*'),
      supabase.from('tax_reminders').select('*').eq('vehicle_id', vehicleId),
    ])
    setFuel(((f.data || []) as FuelLog[]).map((r) => ({ ...r, odometer: Number(r.odometer), total_cost: Number(r.total_cost) })))
    setService(((s.data || []) as ServiceLog[]).map((r) => ({ ...r, total_cost: Number(r.total_cost) })))
    setSchedules((m.data || []) as MaintenanceSchedule[])
    setTypes((t.data || []) as MaintenanceType[])
    setTaxes((tx.data || []) as TaxReminder[])
    setLoading(false)
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const typeName = useCallback((id: string) => types.find((t) => t.id === id)?.name || '—', [types])

  const now = new Date()
  const thisMonth = now.toISOString().slice(0, 7)
  const bbmBulanIni = fuel.filter((f) => f.log_date.startsWith(thisMonth)).reduce((s, f) => s + f.total_cost, 0)
  const serviceBulanIni = service.filter((s) => s.log_date.startsWith(thisMonth)).reduce((s, x) => s + x.total_cost, 0)
  const currentOdo = fuel.length ? Math.max(...fuel.map((f) => f.odometer)) : 0

  const reminders = useMemo(() => {
    const items: { label: string; status: ReturnType<typeof kmStatus> }[] = []
    schedules.forEach((s) => {
      if (s.last_done_odometer != null && s.interval_km) {
        const st = kmStatus(currentOdo, s.last_done_odometer, s.interval_km)
        if (st.overdue || st.near) items.push({ label: typeName(s.maintenance_type_id), status: st })
      }
    })
    taxes.forEach((t) => {
      const st = dateStatus(t.due_date)
      if (st.overdue || st.near) items.push({ label: t.name, status: st })
    })
    return items
  }, [schedules, taxes, currentOdo, typeName])

  return (
    <PageShell
      title="Dashboard"
      subtitle="Ringkasan pemeliharaan kendaraan"
      actions={<VehicleSelect vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />}
    >
      {reminders.length > 0 && (
        <div className="mb-5 space-y-2">
          {reminders.map((r, i) => (
            <div
              key={i}
              className={
                'rounded-lg px-4 py-3 text-sm ' +
                (r.status.overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')
              }
            >
              <strong>{r.label}</strong> — {r.status.label}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Kendaraan" value={String(vehicles.length)} />
        <StatCard label="BBM Bulan Ini" value={fmtRupiah(bbmBulanIni)} />
        <StatCard label="Service Bulan Ini" value={fmtRupiah(serviceBulanIni)} />
        <StatCard label="Odometer Terakhir" value={currentOdo ? currentOdo.toLocaleString('id-ID') + ' km' : '—'} />
      </div>

      {!loading && vehicles.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Belum ada kendaraan. Tambahkan dulu di menu <strong>Master → Plat Kendaraan</strong>.
        </div>
      )}
    </PageShell>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
    </div>
  )
}
