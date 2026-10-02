'use client'

import { useEffect, useState } from 'react'
import AuthGate from '@/components/AuthGate'
import { Field, Modal, ModalFooter, PageShell, inputCls } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { fmtRupiah, fmtDate, todayISO } from '@/lib/utils'
import type { Vehicle, FuelType, FuelPrice, MaintenanceType } from '@/lib/types'

type Tab = 'bensin' | 'kendaraan' | 'perawatan'

export default function MasterPage() {
  const [tab, setTab] = useState<Tab>('bensin')

  return (
    <AuthGate>
      <PageShell title="Master Data" subtitle="Kelola data acuan yang dipakai di seluruh modul.">
        <div className="mb-5 flex gap-6 overflow-x-auto border-b border-gray-200">
          {(
            [
              ['bensin', 'Bensin'],
              ['kendaraan', 'Plat Kendaraan'],
              ['perawatan', 'Jenis Perawatan'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={
                'whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors ' +
                (tab === key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700')
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'bensin' && <BensinTab />}
        {tab === 'kendaraan' && <KendaraanTab />}
        {tab === 'perawatan' && <PerawatanTab />}
      </PageShell>
    </AuthGate>
  )
}

/* =========================================================
   BENSIN — jenis BBM + riwayat harga
   ========================================================= */
function BensinTab() {
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [prices, setPrices] = useState<FuelPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ fuelTypeName: '', price: '', effectiveDate: todayISO() })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: types }, { data: priceRows }] = await Promise.all([
      supabase.from('fuel_types').select('*').order('name'),
      supabase.from('fuel_prices').select('*').order('effective_date', { ascending: false }),
    ])
    setFuelTypes(types || [])
    setPrices(priceRows || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function fuelTypeName(id: string) {
    return fuelTypes.find((f) => f.id === id)?.name || '—'
  }

  function openAdd() {
    setEditingId(null)
    setForm({ fuelTypeName: '', price: '', effectiveDate: todayISO() })
    setShowForm(true)
  }

  function openEdit(p: FuelPrice) {
    setEditingId(p.id)
    setForm({
      fuelTypeName: fuelTypeName(p.fuel_type_id),
      price: String(p.price_per_liter),
      effectiveDate: p.effective_date,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.fuelTypeName.trim() || !form.price) return
    setSaving(true)
    try {
      // Cari atau buat jenis BBM
      let fuelTypeId = fuelTypes.find(
        (f) => f.name.toLowerCase() === form.fuelTypeName.trim().toLowerCase()
      )?.id

      if (!fuelTypeId) {
        const { data, error } = await supabase
          .from('fuel_types')
          .insert({ name: form.fuelTypeName.trim() })
          .select()
          .single()
        if (error) throw error
        fuelTypeId = data.id
      }

      if (editingId) {
        const { error } = await supabase
          .from('fuel_prices')
          .update({
            fuel_type_id: fuelTypeId,
            price_per_liter: Number(form.price),
            effective_date: form.effectiveDate,
          })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('fuel_prices').insert({
          fuel_type_id: fuelTypeId,
          price_per_liter: Number(form.price),
          effective_date: form.effectiveDate,
        })
        if (error) throw error
      }

      setShowForm(false)
      await load()
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus riwayat harga ini?')) return
    const { error } = await supabase.from('fuel_prices').delete().eq('id', id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Edit harga = tambah baris baru. Harga lama tetap tersimpan sebagai riwayat, tidak
          berubah oleh perubahan harga baru.
        </p>
        <button
          onClick={openAdd}
          className="whitespace-nowrap rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Tambah Harga
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nama Bensin</th>
              <th className="px-4 py-3 text-left font-medium">Harga Per Liter</th>
              <th className="px-4 py-3 text-left font-medium">Per Tanggal</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Memuat…
                </td>
              </tr>
            )}
            {!loading && prices.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Belum ada data harga.
                </td>
              </tr>
            )}
            {prices.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{fuelTypeName(p.fuel_type_id)}</td>
                <td className="px-4 py-3">{fmtRupiah(p.price_per_liter)}</td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(p.effective_date)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(p)}
                    className="mr-3 text-gray-500 hover:text-gray-900"
                    title="Ubah"
                  >
                    Ubah
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Hapus"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editingId ? 'Ubah Harga BBM' : 'Tambah Harga BBM'} onClose={() => setShowForm(false)}>
          <Field label="Nama Bensin">
            <input
              list="fuel-type-list"
              className={inputCls}
              value={form.fuelTypeName}
              onChange={(e) => setForm({ ...form, fuelTypeName: e.target.value })}
              placeholder="Ketik atau pilih (mis. Pertalite)"
            />
            <datalist id="fuel-type-list">
              {fuelTypes.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Harga Per Liter (Rp)">
            <input
              type="number"
              className={inputCls}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <Field label="Berlaku Per Tanggal">
            <input
              type="date"
              className={inputCls}
              value={form.effectiveDate}
              onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
            />
          </Field>
          <ModalFooter onCancel={() => setShowForm(false)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

/* =========================================================
   PLAT KENDARAAN
   ========================================================= */
function KendaraanTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ plate: '', name: '', intervalKm: '3000', intervalMonth: '6' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('vehicles').select('*').order('created_at')
    setVehicles(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openAdd() {
    setEditingId(null)
    setForm({ plate: '', name: '', intervalKm: '3000', intervalMonth: '6' })
    setShowForm(true)
  }

  function openEdit(v: Vehicle) {
    setEditingId(v.id)
    setForm({
      plate: v.plate_number,
      name: v.name || '',
      intervalKm: String(v.interval_service_km),
      intervalMonth: String(v.interval_service_month),
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.plate.trim()) return
    setSaving(true)
    try {
      const payload = {
        plate_number: form.plate.trim(),
        name: form.name.trim() || null,
        interval_service_km: Number(form.intervalKm) || 3000,
        interval_service_month: Number(form.intervalMonth) || 6,
      }
      const { error } = editingId
        ? await supabase.from('vehicles').update(payload).eq('id', editingId)
        : await supabase.from('vehicles').insert(payload)
      if (error) throw error
      setShowForm(false)
      await load()
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus kendaraan ini? Semua data BBM/Service/Jadwal terkait ikut terhapus.')) return
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openAdd}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Tambah Kendaraan
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Plat</th>
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Interval Servis</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">Memuat…</td>
              </tr>
            )}
            {!loading && vehicles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">Belum ada kendaraan.</td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{v.plate_number}</td>
                <td className="px-4 py-3">{v.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {v.interval_service_km.toLocaleString('id-ID')} km / {v.interval_service_month} bln
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(v)} className="mr-3 text-gray-500 hover:text-gray-900">Ubah</button>
                  <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editingId ? 'Ubah Kendaraan' : 'Tambah Kendaraan'} onClose={() => setShowForm(false)}>
          <Field label="Nomor Plat">
            <input className={inputCls} value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} placeholder="B 1234 XYZ" />
          </Field>
          <Field label="Nama/Keterangan (opsional)">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Avanza Kantor" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Interval Servis (KM)">
              <input type="number" className={inputCls} value={form.intervalKm} onChange={(e) => setForm({ ...form, intervalKm: e.target.value })} />
            </Field>
            <Field label="Interval Servis (Bulan)">
              <input type="number" className={inputCls} value={form.intervalMonth} onChange={(e) => setForm({ ...form, intervalMonth: e.target.value })} />
            </Field>
          </div>
          <ModalFooter onCancel={() => setShowForm(false)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

/* =========================================================
   JENIS PERAWATAN (dulu "Maintenance" + "Tipe Service" — digabung)
   ========================================================= */
function PerawatanTab() {
  const [types, setTypes] = useState<MaintenanceType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('maintenance_types').select('*').order('name')
    setTypes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openAdd() {
    setEditingId(null)
    setName('')
    setShowForm(true)
  }
  function openEdit(t: MaintenanceType) {
    setEditingId(t.id)
    setName(t.name)
    setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const { error } = editingId
        ? await supabase.from('maintenance_types').update({ name: name.trim() }).eq('id', editingId)
        : await supabase.from('maintenance_types').insert({ name: name.trim() })
      if (error) throw error
      setShowForm(false)
      await load()
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus jenis perawatan ini?')) return
    const { error } = await supabase.from('maintenance_types').delete().eq('id', id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    load()
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Dipakai sebagai kategori di form Service, dan sebagai dasar Jadwal Pemeliharaan.
      </p>
      <div className="mb-4 flex justify-end">
        <button onClick={openAdd} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          + Tambah Jenis Perawatan
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">Memuat…</td></tr>}
            {!loading && types.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400">Belum ada jenis perawatan.</td></tr>
            )}
            {types.map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(t)} className="mr-3 text-gray-500 hover:text-gray-900">Ubah</button>
                  <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editingId ? 'Ubah Jenis Perawatan' : 'Tambah Jenis Perawatan'} onClose={() => setShowForm(false)}>
          <Field label="Nama">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ganti Oli" />
          </Field>
          <ModalFooter onCancel={() => setShowForm(false)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}
