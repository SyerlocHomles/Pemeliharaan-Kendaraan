'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthGate from '@/components/AuthGate'
import { Field, Modal, ModalFooter, PageShell, VehicleSelect, inputCls } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useVehicles } from '@/lib/hooks'
import { fmtDate, fmtNumber, fmtRupiah, todayISO, uploadEvidence } from '@/lib/utils'
import type { FuelLog, FuelPrice, FuelType } from '@/lib/types'

type Row = FuelLog & { calcMileage: number | null; calcKmPerLiter: number | null }

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

/** Harga BBM yang berlaku pada tanggal tertentu: ambil harga terbaru yang
 * tanggal berlakunya <= tanggal transaksi. Harga yang lebih baru di Master
 * TIDAK mengubah transaksi lama, karena harga disalin (snapshot) ke tiap
 * baris transaksi saat disimpan. */
function priceFor(prices: FuelPrice[], fuelTypeId: string, dateISO: string): number | null {
  const own = prices.filter((p) => p.fuel_type_id === fuelTypeId)
  if (own.length === 0) return null
  const eligible = own
    .filter((p) => p.effective_date <= dateISO)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))
  if (eligible.length > 0) return Number(eligible[0].price_per_liter)
  const oldest = [...own].sort((a, b) => a.effective_date.localeCompare(b.effective_date))[0]
  return Number(oldest.price_per_liter)
}

export default function BbmPage() {
  return (
    <AuthGate>
      <BbmContent />
    </AuthGate>
  )
}

function BbmContent() {
  const { vehicles, vehicleId, setVehicleId, loading: vehiclesLoading } = useVehicles()
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [prices, setPrices] = useState<FuelPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<Row | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FuelLog | null>(null)

  const load = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    const [logRes, typeRes, priceRes] = await Promise.all([
      supabase.from('fuel_logs').select('*').eq('vehicle_id', vehicleId),
      supabase.from('fuel_types').select('*').order('name'),
      supabase.from('fuel_prices').select('*'),
    ])
    const coerced = ((logRes.data || []) as FuelLog[]).map((l) => ({
      ...l,
      odometer: Number(l.odometer),
      liters: l.liters === null ? null : Number(l.liters),
      price_per_liter: Number(l.price_per_liter),
      total_cost: Number(l.total_cost),
    }))
    setLogs(coerced)
    setFuelTypes((typeRes.data || []) as FuelType[])
    setPrices((priceRes.data || []) as FuelPrice[])
    setLoading(false)
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const typeName = useCallback(
    (id: string | null) => fuelTypes.find((f) => f.id === id)?.name || '—',
    [fuelTypes]
  )

  // Mileage & KM/L selalu dihitung ulang dari data yang ada, jadi tetap
  // benar walaupun ada transaksi lama yang diubah/dihapus/disisipkan.
  const rows = useMemo<Row[]>(() => {
    const asc = [...logs].sort((a, b) => a.odometer - b.odometer)
    const calc = new Map<string, { m: number | null; k: number | null }>()
    asc.forEach((l, i) => {
      const prev = asc[i - 1]
      const m = prev ? l.odometer - prev.odometer : null
      const k = m !== null && m > 0 && l.liters && l.liters > 0 ? m / l.liters : null
      calc.set(l.id, { m, k })
    })
    return [...logs]
      .sort((a, b) =>
        (b.log_date + (b.log_time || '')).localeCompare(a.log_date + (a.log_time || ''))
      )
      .map((l) => ({
        ...l,
        calcMileage: calc.get(l.id)?.m ?? null,
        calcKmPerLiter: calc.get(l.id)?.k ?? null,
      }))
  }, [logs])

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: Row) {
    setDetail(null)
    setEditing(row)
    setFormOpen(true)
  }

  async function handleDelete(row: Row) {
    if (!confirm('Hapus transaksi BBM ini?')) return
    const { error } = await supabase.from('fuel_logs').delete().eq('id', row.id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    setDetail(null)
    load()
  }

  return (
    <PageShell
      title="BBM"
      subtitle="Log pengisian bahan bakar"
      actions={
        <>
          <VehicleSelect vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
          <button
            onClick={openAdd}
            disabled={!vehicleId}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            + Tambah BBM
          </button>
        </>
      }
    >
      {!vehiclesLoading && vehicles.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          Belum ada kendaraan. Tambahkan dulu di menu <strong>Master → Plat Kendaraan</strong>.
        </div>
      )}

      {vehicleId && (
        <div className="max-h-[calc(100vh-11rem)] overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs text-gray-500">
              <tr>
                {[
                  'Tanggal / Jam',
                  'Driver',
                  'SPBU',
                  'Bensin',
                  'Liter',
                  'Harga/L',
                  'Total',
                  'Odometer',
                  'Mileage',
                  'KM/L',
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Memuat…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Belum ada transaksi BBM untuk kendaraan ini.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const suspicious =
                  (r.calcMileage !== null && r.calcMileage < 0) ||
                  (r.calcKmPerLiter !== null && r.calcKmPerLiter > 60)
                return (
                  <tr
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {fmtDate(r.log_date)}
                      <span className="ml-1 text-gray-400">{r.log_time?.slice(0, 5)}</span>
                    </td>
                    <td className="px-4 py-3">{r.driver_name || '—'}</td>
                    <td className="px-4 py-3">{r.station || '—'}</td>
                    <td className="px-4 py-3">{typeName(r.fuel_type_id)}</td>
                    <td className="px-4 py-3">{r.liters !== null ? `${fmtNumber(r.liters, 2)} L` : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtRupiah(r.price_per_liter)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{fmtRupiah(r.total_cost)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtNumber(r.odometer, 0)} km</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.calcMileage !== null ? `${fmtNumber(r.calcMileage, 0)} km` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.calcKmPerLiter !== null ? fmtNumber(r.calcKmPerLiter, 1) : '—'}
                      {suspicious && (
                        <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          ⚠ Cek data
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal
          title="Detail Transaksi BBM"
          onClose={() => setDetail(null)}
          wide
          headerActions={
            <>
              <button onClick={() => openEdit(detail)} className="text-sm text-gray-600 hover:text-gray-900" title="Ubah">
                ✎ Ubah
              </button>
              <button onClick={() => handleDelete(detail)} className="text-sm text-red-600 hover:text-red-800" title="Hapus">
                🗑 Hapus
              </button>
            </>
          }
        >
          <DetailGrid
            items={[
              ['Tanggal', fmtDate(detail.log_date)],
              ['Jam', detail.log_time?.slice(0, 5) || '—'],
              ['Nama Driver', detail.driver_name || '—'],
              ['SPBU', detail.station || '—'],
              ['Jenis Bensin', typeName(detail.fuel_type_id)],
              ['Jumlah Liter', detail.liters !== null ? `${fmtNumber(detail.liters, 2)} L` : '—'],
              ['Harga per Liter', fmtRupiah(detail.price_per_liter)],
              ['Total Bayar', fmtRupiah(detail.total_cost)],
              ['Odometer', `${fmtNumber(detail.odometer, 0)} km`],
              ['Mileage', detail.calcMileage !== null ? `${fmtNumber(detail.calcMileage, 0)} km` : '—'],
              ['KM/L', detail.calcKmPerLiter !== null ? fmtNumber(detail.calcKmPerLiter, 1) : '—'],
            ]}
          />
          {detail.photo_url && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-medium text-gray-500">Bukti</div>
              <a href={detail.photo_url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.photo_url}
                  alt="Bukti BBM"
                  className="max-h-72 rounded-lg border border-gray-200 object-contain"
                />
              </a>
            </div>
          )}
        </Modal>
      )}

      {formOpen && vehicleId && (
        <FuelForm
          vehicleId={vehicleId}
          fuelTypes={fuelTypes}
          prices={prices}
          logs={logs}
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            load()
          }}
        />
      )}
    </PageShell>
  )
}

function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="font-medium text-gray-900">{value}</div>
        </div>
      ))}
    </div>
  )
}

/* =========================================================
   FORM TAMBAH / UBAH
   ========================================================= */
function FuelForm({
  vehicleId,
  fuelTypes,
  prices,
  logs,
  editing,
  onClose,
  onSaved,
}: {
  vehicleId: string
  fuelTypes: FuelType[]
  prices: FuelPrice[]
  logs: FuelLog[]
  editing: FuelLog | null
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(editing?.log_date ?? todayISO())
  const [time, setTime] = useState(editing?.log_time?.slice(0, 5) ?? nowTime())
  const [driver, setDriver] = useState(editing?.driver_name ?? '')
  const [station, setStation] = useState(editing?.station ?? '')
  const [odometer, setOdometer] = useState(editing ? String(editing.odometer) : '')
  const [liters, setLiters] = useState(editing?.liters != null ? String(editing.liters) : '')
  const [fuelTypeId, setFuelTypeId] = useState(editing?.fuel_type_id ?? fuelTypes[0]?.id ?? '')
  const [priceLocked, setPriceLocked] = useState(!!editing)
  const [total, setTotal] = useState(editing ? String(editing.total_cost) : '')
  const [totalManual, setTotalManual] = useState(!!editing)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Saat edit, harga lama dipertahankan sampai tanggal/jenis bensin diubah.
  const masterPrice = useMemo(() => priceFor(prices, fuelTypeId, date), [prices, fuelTypeId, date])
  const price: number | null =
    priceLocked && editing ? Number(editing.price_per_liter) : masterPrice

  // Total disarankan = liter × harga/liter. Tetap bisa diketik manual
  // supaya sesuai nominal struk (mis. isi penuh dibulatkan jadi Rp25.000).
  useEffect(() => {
    if (totalManual) return
    const l = Number(liters)
    if (l > 0 && price) setTotal(String(Math.round(l * price)))
  }, [liters, price, totalManual])

  const latestOdo = useMemo(() => {
    const others = logs.filter((l) => l.id !== editing?.id)
    return others.length ? Math.max(...others.map((l) => l.odometer)) : null
  }, [logs, editing])

  const odoNum = Number(odometer)
  const odoWarn = latestOdo !== null && odoNum > 0 && odoNum <= latestOdo

  async function handleSave() {
    const odo = Number(odometer)
    const litersNum = liters ? Number(liters) : null
    const totalNum = Number(total)

    if (!date) return alert('Tanggal wajib diisi.')
    if (!(odo > 0)) return alert('Odometer harus lebih besar dari 0.')
    if (litersNum !== null && !(litersNum > 0))
      return alert('Liter tidak boleh 0 atau minus — kosongkan saja kalau tidak tahu.')
    if (!(totalNum > 0)) return alert('Total bayar wajib diisi dan lebih besar dari 0.')

    setSaving(true)
    try {
      let photoUrl = editing?.photo_url ?? null
      if (file) photoUrl = await uploadEvidence(file, 'bbm')

      // Harga per liter yang disimpan: dari Master; kalau belum ada,
      // hitung dari total ÷ liter supaya tetap tercatat masuk akal.
      const pricePerLiter = price ?? (litersNum ? Math.round(totalNum / litersNum) : 0)

      const others = logs.filter((l) => l.id !== editing?.id && l.odometer < odo)
      const prev = others.length ? Math.max(...others.map((l) => l.odometer)) : null
      const mileage = prev !== null ? odo - prev : null
      const kmPerLiter = mileage && mileage > 0 && litersNum ? mileage / litersNum : null

      const payload = {
        vehicle_id: vehicleId,
        log_date: date,
        log_time: time || null,
        driver_name: driver.trim() || null,
        station: station.trim() || null,
        odometer: odo,
        liters: litersNum,
        fuel_type_id: fuelTypeId || null,
        price_per_liter: pricePerLiter,
        total_cost: totalNum,
        mileage,
        km_per_liter: kmPerLiter,
        photo_url: photoUrl,
      }

      const { error } = editing
        ? await supabase.from('fuel_logs').update(payload).eq('id', editing.id)
        : await supabase.from('fuel_logs').insert(payload)
      if (error) throw error

      onSaved()
    } catch (err: any) {
      alert('Gagal menyimpan: ' + (err?.message || err))
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Ubah Transaksi BBM' : 'Tambah Transaksi BBM'} onClose={onClose} wide>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Tanggal">
          <input
            type="date"
            className={inputCls}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setPriceLocked(false)
            }}
          />
        </Field>
        <Field label="Jam">
          <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Nama Driver">
          <input className={inputCls} value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Nama pengemudi" />
        </Field>
        <Field label="SPBU / Stasiun Pengisian">
          <input className={inputCls} value={station} onChange={(e) => setStation(e.target.value)} placeholder="Contoh: Pertamina Jl. Merdeka" />
        </Field>
        <Field label="Odometer (km)">
          <input type="number" className={inputCls} value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="Contoh: 12345" />
        </Field>
        <Field label="Tipe Bensin">
          <select
            className={inputCls}
            value={fuelTypeId}
            onChange={(e) => {
              setFuelTypeId(e.target.value)
              setPriceLocked(false)
            }}
          >
            {fuelTypes.length === 0 && <option value="">Belum ada — isi di Master</option>}
            {fuelTypes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {odoWarn && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ Odometer ini ({fmtNumber(odoNum, 0)} km) lebih kecil atau sama dengan catatan tertinggi ({fmtNumber(latestOdo, 0)} km). Pastikan tidak salah ketik.
        </div>
      )}

      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label="Jumlah Liter (boleh kosong)">
          <input type="number" step="0.01" className={inputCls} value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="Contoh: 3.5" />
        </Field>
        <Field label="Harga per Liter (otomatis dari Master)">
          <input className={inputCls + ' bg-gray-50 text-gray-600'} value={price !== null ? fmtRupiah(price) : 'Belum ada harga di Master'} readOnly />
        </Field>
        <Field label="Total Bayar (Rp)">
          <input
            type="number"
            className={inputCls}
            value={total}
            onChange={(e) => {
              setTotal(e.target.value)
              setTotalManual(true)
            }}
            placeholder="Sesuai struk"
          />
        </Field>
      </div>
      <p className="-mt-1 mb-3 text-xs text-gray-500">
        Total otomatis = liter × harga per liter, tapi boleh diubah sesuai nominal struk yang sebenarnya.
      </p>

      <Field label="Foto Bukti (struk / pompa)">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
        {editing?.photo_url && !file && (
          <span className="mt-1 block text-xs text-gray-500">Sudah ada foto tersimpan. Pilih foto baru untuk menggantinya.</span>
        )}
      </Field>

      <ModalFooter onCancel={onClose} onSave={handleSave} saving={saving} />
    </Modal>
  )
}
