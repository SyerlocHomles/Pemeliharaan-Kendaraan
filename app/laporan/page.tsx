'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthGate from '@/components/AuthGate'
import { PageShell, VehicleSelect } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useVehicles } from '@/lib/hooks'
import { fmtNumber, fmtRupiah } from '@/lib/utils'
import type { FuelLog, ServiceLog } from '@/lib/types'

type Tab = 'fillups' | 'costs' | 'distance'

export default function LaporanPage() {
  return (
    <AuthGate>
      <LaporanContent />
    </AuthGate>
  )
}

function LaporanContent() {
  const { vehicles, vehicleId, setVehicleId } = useVehicles()
  const [fuel, setFuel] = useState<FuelLog[]>([])
  const [service, setService] = useState<ServiceLog[]>([])
  const [tab, setTab] = useState<Tab>('fillups')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    const [f, s] = await Promise.all([
      supabase.from('fuel_logs').select('*').eq('vehicle_id', vehicleId),
      supabase.from('service_logs').select('*').eq('vehicle_id', vehicleId),
    ])
    setFuel(((f.data || []) as FuelLog[]).map((r) => ({ ...r, odometer: Number(r.odometer), liters: r.liters == null ? null : Number(r.liters), total_cost: Number(r.total_cost) })))
    setService(((s.data || []) as ServiceLog[]).map((r) => ({ ...r, total_cost: Number(r.total_cost) })))
    setLoading(false)
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const fuelSorted = [...fuel].sort((a, b) => a.odometer - b.odometer)
    const now = new Date()
    const ym = (d: string) => d.slice(0, 7)
    const thisMonth = now.toISOString().slice(0, 7)
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = prevMonthDate.toISOString().slice(0, 7)
    const thisYear = String(now.getFullYear())
    const prevYear = String(now.getFullYear() - 1)

    const allCosts = [
      ...fuel.map((f) => ({ date: f.log_date, cost: f.total_cost })),
      ...service.map((s) => ({ date: s.log_date, cost: s.total_cost })),
    ]
    const sum = (rows: { cost: number }[]) => rows.reduce((s, r) => s + r.cost, 0)

    const bills = fuel.map((f) => f.total_cost).filter((c) => c > 0)
    const prices = fuel.filter((f) => f.liters && f.liters > 0).map((f) => f.total_cost / (f.liters as number))

    const kmlList: number[] = []
    const costPerKmList: number[] = []
    for (let i = 1; i < fuelSorted.length; i++) {
      const mileage = fuelSorted[i].odometer - fuelSorted[i - 1].odometer
      if (mileage > 0) {
        if (fuelSorted[i].liters && fuelSorted[i].liters! > 0) kmlList.push(mileage / fuelSorted[i].liters!)
        costPerKmList.push(fuelSorted[i].total_cost / mileage)
      }
    }

    const dates = allCosts.map((c) => c.date).filter(Boolean).sort()
    const totalCost = sum(allCosts)
    let avgPerDay: number | null = null
    let avgPerMonth: number | null = null
    if (dates.length) {
      const days = Math.max(1, Math.round((now.getTime() - new Date(dates[0]).getTime()) / 86400000))
      avgPerDay = totalCost / days
      avgPerMonth = totalCost / Math.max(1, days / 30.4)
    }

    const totalDistance = fuelSorted.length > 1 ? fuelSorted[fuelSorted.length - 1].odometer - fuelSorted[0].odometer : 0

    return {
      costs: {
        total: totalCost,
        thisYear: sum(allCosts.filter((c) => c.date.startsWith(thisYear))),
        prevYear: sum(allCosts.filter((c) => c.date.startsWith(prevYear))),
        thisMonth: sum(allCosts.filter((c) => ym(c.date) === thisMonth)),
        prevMonth: sum(allCosts.filter((c) => ym(c.date) === prevMonth)),
        lowestBill: bills.length ? Math.min(...bills) : null,
        highestBill: bills.length ? Math.max(...bills) : null,
        bestPrice: prices.length ? Math.min(...prices) : null,
        worstPrice: prices.length ? Math.max(...prices) : null,
        avgCostPerKm: costPerKmList.length ? costPerKmList.reduce((a, b) => a + b, 0) / costPerKmList.length : null,
        avgPerDay,
        avgPerMonth,
      },
      fillups: {
        count: fuel.length,
        totalLiters: fuel.reduce((s, f) => s + (f.liters || 0), 0),
        avgKmPerLiter: kmlList.length ? kmlList.reduce((a, b) => a + b, 0) / kmlList.length : null,
        bestKmPerLiter: kmlList.length ? Math.max(...kmlList) : null,
        worstKmPerLiter: kmlList.length ? Math.min(...kmlList) : null,
      },
      distance: {
        total: totalDistance,
        avgPerMonth:
          dates.length && totalDistance
            ? totalDistance / Math.max(1, Math.round((now.getTime() - new Date(dates[0]).getTime()) / 86400000 / 30.4))
            : 0,
        avgPerFillup: fuelSorted.length > 1 ? totalDistance / (fuelSorted.length - 1) : 0,
      },
    }
  }, [fuel, service])

  return (
    <PageShell
      title="Laporan / Statistik"
      actions={<VehicleSelect vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />}
    >
      <div className="mb-5 flex gap-6 border-b border-gray-200">
        {(
          [
            ['fillups', 'Fill-ups'],
            ['costs', 'Costs'],
            ['distance', 'Distance'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              'border-b-2 py-3 text-sm font-medium ' +
              (tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-gray-400">Memuat…</div>}

      {!loading && tab === 'fillups' && (
        <StatGrid
          items={[
            ['Jumlah Pengisian', String(stats.fillups.count)],
            ['Total Liter', fmtNumber(stats.fillups.totalLiters) + ' L'],
            ['Rata-rata Konsumsi', stats.fillups.avgKmPerLiter != null ? fmtNumber(stats.fillups.avgKmPerLiter) + ' km/l' : '—'],
            ['Konsumsi Terbaik', stats.fillups.bestKmPerLiter != null ? fmtNumber(stats.fillups.bestKmPerLiter) + ' km/l' : '—'],
            ['Konsumsi Terburuk', stats.fillups.worstKmPerLiter != null ? fmtNumber(stats.fillups.worstKmPerLiter) + ' km/l' : '—'],
          ]}
        />
      )}

      {!loading && tab === 'costs' && (
        <StatGrid
          items={[
            ['Total Costs', fmtRupiah(stats.costs.total)],
            ['Tahun Ini', `${fmtRupiah(stats.costs.thisYear)} (${fmtRupiah(stats.costs.prevYear)} th lalu)`],
            ['Bulan Ini', `${fmtRupiah(stats.costs.thisMonth)} (${fmtRupiah(stats.costs.prevMonth)} bln lalu)`],
            ['Bill Terendah', fmtRupiah(stats.costs.lowestBill)],
            ['Bill Tertinggi', fmtRupiah(stats.costs.highestBill)],
            ['Harga BBM Terbaik/L', fmtRupiah(stats.costs.bestPrice)],
            ['Harga BBM Terburuk/L', fmtRupiah(stats.costs.worstPrice)],
            ['Rata-rata Biaya/KM', stats.costs.avgCostPerKm != null ? fmtRupiah(stats.costs.avgCostPerKm) : '—'],
            ['Rata-rata / Hari', stats.costs.avgPerDay != null ? fmtRupiah(stats.costs.avgPerDay) : '—'],
            ['Rata-rata / Bulan', stats.costs.avgPerMonth != null ? fmtRupiah(stats.costs.avgPerMonth) : '—'],
          ]}
        />
      )}

      {!loading && tab === 'distance' && (
        <StatGrid
          items={[
            ['Total Jarak Tempuh', fmtNumber(stats.distance.total, 0) + ' km'],
            ['Rata-rata / Bulan', fmtNumber(stats.distance.avgPerMonth, 0) + ' km'],
            ['Rata-rata / Isi BBM', fmtNumber(stats.distance.avgPerFillup, 0) + ' km'],
          ]}
        />
      )}
    </PageShell>
  )
}

function StatGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xl font-bold text-gray-900">{value}</div>
          <div className="mt-1 text-xs text-gray-500">{label}</div>
        </div>
      ))}
    </div>
  )
}
