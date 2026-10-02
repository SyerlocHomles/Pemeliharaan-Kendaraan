'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthGate from '@/components/AuthGate'
import { Field, Modal, ModalFooter, PageShell, VehicleSelect, inputCls } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useVehicles } from '@/lib/hooks'
import { fmtDate, fmtRupiah, todayISO, uploadEvidence } from '@/lib/utils'
import type { MaintenanceType, ServiceItem, ServiceLog } from '@/lib/types'

type DraftItem = {
  key: string
  part_name: string
  qty: string
  unit: string
  unit_price: string
  discount: string
}

function emptyItem(): DraftItem {
  return { key: Math.random().toString(36).slice(2), part_name: '', qty: '1', unit: '', unit_price: '', discount: '0' }
}

function itemTotal(it: DraftItem): number {
  const qty = Number(it.qty) || 0
  const price = Number(it.unit_price) || 0
  const disc = Number(it.discount) || 0
  return Math.max(0, qty * price - disc)
}

export default function ServicePage() {
  return (
    <AuthGate>
      <ServiceContent />
    </AuthGate>
  )
}

function ServiceContent() {
  const { vehicles, vehicleId, setVehicleId } = useVehicles()
  const [logs, setLogs] = useState<ServiceLog[]>([])
  const [types, setTypes] = useState<MaintenanceType[]>([])
  const [itemsByLog, setItemsByLog] = useState<Record<string, ServiceItem[]>>({})
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<ServiceLog | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceLog | null>(null)

  const load = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    const [logRes, typeRes] = await Promise.all([
      supabase.from('service_logs').select('*').eq('vehicle_id', vehicleId).order('log_date', { ascending: false }),
      supabase.from('maintenance_types').select('*').order('name'),
    ])
    const logRows = (logRes.data || []) as ServiceLog[]
    setLogs(logRows)
    setTypes((typeRes.data || []) as MaintenanceType[])

    if (logRows.length) {
      const { data: items } = await supabase
        .from('service_items')
        .select('*')
        .in('service_log_id', logRows.map((l) => l.id))
      const grouped: Record<string, ServiceItem[]> = {}
      ;(items || []).forEach((it: ServiceItem) => {
        grouped[it.service_log_id] = grouped[it.service_log_id] || []
        grouped[it.service_log_id].push(it)
      })
      setItemsByLog(grouped)
    } else {
      setItemsByLog({})
    }
    setLoading(false)
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const typeName = useCallback((id: string | null) => types.find((t) => t.id === id)?.name || '—', [types])

  async function handleDelete(log: ServiceLog) {
    if (!confirm('Hapus transaksi service ini beserta seluruh rincian sparepart-nya?')) return
    const { error } = await supabase.from('service_logs').delete().eq('id', log.id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    setDetail(null)
    load()
  }

  return (
    <PageShell
      title="Service"
      subtitle="Transaksi ke bengkel: invoice dan rincian sparepart"
      actions={
        <>
          <VehicleSelect vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
          <button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            disabled={!vehicleId}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            + Tambah Service
          </button>
        </>
      }
    >
      {vehicleId && (
        <div className="max-h-[calc(100vh-11rem)] overflow-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs text-gray-500">
              <tr>
                {['Tanggal', 'Invoice', 'Workshop', 'Jenis Perawatan', 'Jml Item', 'Total'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Memuat…</td></tr>}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Belum ada transaksi service.</td></tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} onClick={() => setDetail(l)} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">{fmtDate(l.log_date)}</td>
                  <td className="px-4 py-3">{l.invoice_number || '—'}</td>
                  <td className="px-4 py-3">{l.workshop || '—'}</td>
                  <td className="px-4 py-3">{typeName(l.maintenance_type_id)}</td>
                  <td className="px-4 py-3">{(itemsByLog[l.id] || []).length}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{fmtRupiah(l.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Modal
          title={`Detail Service — ${detail.invoice_number || fmtDate(detail.log_date)}`}
          onClose={() => setDetail(null)}
          wide
          headerActions={
            <>
              <button onClick={() => { setDetail(null); setEditing(detail); setFormOpen(true) }} className="text-sm text-gray-600 hover:text-gray-900">✎ Ubah</button>
              <button onClick={() => handleDelete(detail)} className="text-sm text-red-600 hover:text-red-800">🗑 Hapus</button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><div className="text-xs text-gray-500">Tanggal</div><div className="font-medium">{fmtDate(detail.log_date)}</div></div>
            <div><div className="text-xs text-gray-500">Invoice</div><div className="font-medium">{detail.invoice_number || '—'}</div></div>
            <div><div className="text-xs text-gray-500">Workshop</div><div className="font-medium">{detail.workshop || '—'}</div></div>
            <div><div className="text-xs text-gray-500">Jenis Perawatan</div><div className="font-medium">{typeName(detail.maintenance_type_id)}</div></div>
            <div><div className="text-xs text-gray-500">Odometer</div><div className="font-medium">{detail.odometer ? `${detail.odometer.toLocaleString('id-ID')} km` : '—'}</div></div>
            <div><div className="text-xs text-gray-500">Total</div><div className="font-medium">{fmtRupiah(detail.total_cost)}</div></div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {['Sparepart', 'Jml', 'Satuan', 'Harga', 'Diskon', 'Total'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(itemsByLog[detail.id] || []).map((it) => (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{it.part_name}</td>
                    <td className="px-3 py-2">{it.qty}</td>
                    <td className="px-3 py-2">{it.unit || '—'}</td>
                    <td className="px-3 py-2">{fmtRupiah(it.unit_price)}</td>
                    <td className="px-3 py-2">{fmtRupiah(it.discount)}</td>
                    <td className="px-3 py-2 font-medium">{fmtRupiah(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detail.notes && <p className="mt-3 text-sm text-gray-600">Catatan: {detail.notes}</p>}
          {detail.photo_url && (
            <a href={detail.photo_url} target="_blank" rel="noreferrer" className="mt-3 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.photo_url} alt="Bukti service" className="max-h-72 rounded-lg border border-gray-200 object-contain" />
            </a>
          )}
        </Modal>
      )}

      {formOpen && vehicleId && (
        <ServiceForm
          vehicleId={vehicleId}
          types={types}
          editing={editing}
          initialItems={editing ? itemsByLog[editing.id] || [] : []}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load() }}
        />
      )}
    </PageShell>
  )
}

/* =========================================================
   FORM TAMBAH / UBAH — rincian sparepart draft (tambah/edit/hapus baris)
   ========================================================= */
function ServiceForm({
  vehicleId,
  types,
  editing,
  initialItems,
  onClose,
  onSaved,
}: {
  vehicleId: string
  types: MaintenanceType[]
  editing: ServiceLog | null
  initialItems: ServiceItem[]
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(editing?.log_date ?? todayISO())
  const [invoice, setInvoice] = useState(editing?.invoice_number ?? '')
  const [workshop, setWorkshop] = useState(editing?.workshop ?? '')
  const [typeId, setTypeId] = useState(editing?.maintenance_type_id ?? '')
  const [odometer, setOdometer] = useState(editing?.odometer != null ? String(editing.odometer) : '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<DraftItem[]>(
    initialItems.length
      ? initialItems.map((it) => ({
          key: it.id,
          part_name: it.part_name,
          qty: String(it.qty),
          unit: it.unit || '',
          unit_price: String(it.unit_price),
          discount: String(it.discount),
        }))
      : [emptyItem()]
  )

  const total = items.reduce((s, it) => s + itemTotal(it), 0)

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key))
  }

  async function handleSave() {
    if (!date) return alert('Tanggal wajib diisi.')
    const validItems = items.filter((it) => it.part_name.trim())
    if (validItems.length === 0) return alert('Tambahkan minimal 1 sparepart.')
    for (const it of validItems) {
      if (!(Number(it.qty) > 0)) return alert(`Jumlah untuk "${it.part_name}" harus lebih dari 0.`)
      if (Number(it.unit_price) < 0 || Number(it.discount) < 0)
        return alert(`Harga/diskon untuk "${it.part_name}" tidak boleh minus.`)
    }

    setSaving(true)
    try {
      let photoUrl = editing?.photo_url ?? null
      if (file) photoUrl = await uploadEvidence(file, 'service')

      const payload = {
        vehicle_id: vehicleId,
        log_date: date,
        invoice_number: invoice.trim() || null,
        workshop: workshop.trim() || null,
        maintenance_type_id: typeId || null,
        odometer: odometer ? Number(odometer) : null,
        total_cost: total,
        photo_url: photoUrl,
        notes: notes.trim() || null,
      }

      let logId = editing?.id
      if (editing) {
        const { error } = await supabase.from('service_logs').update(payload).eq('id', editing.id)
        if (error) throw error
        await supabase.from('service_items').delete().eq('service_log_id', editing.id)
      } else {
        const { data, error } = await supabase.from('service_logs').insert(payload).select().single()
        if (error) throw error
        logId = data.id
      }

      const itemRows = validItems.map((it) => ({
        service_log_id: logId,
        part_name: it.part_name.trim(),
        qty: Number(it.qty),
        unit: it.unit.trim() || null,
        unit_price: Number(it.unit_price) || 0,
        discount: Number(it.discount) || 0,
        total: itemTotal(it),
      }))
      const { error: itemError } = await supabase.from('service_items').insert(itemRows)
      if (itemError) throw itemError

      onSaved()
    } catch (err: any) {
      alert('Gagal menyimpan: ' + (err?.message || err))
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Ubah Service' : 'Tambah Service'} onClose={onClose} wide>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Tanggal">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Nomor Invoice">
          <input className={inputCls} value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="Opsional" />
        </Field>
        <Field label="Workshop">
          <input className={inputCls} value={workshop} onChange={(e) => setWorkshop(e.target.value)} placeholder="Nama bengkel" />
        </Field>
        <Field label="Jenis Perawatan">
          <select className={inputCls} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">— Pilih (opsional) —</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Odometer (opsional)">
          <input type="number" className={inputCls} value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </Field>
      </div>

      <div className="mb-2 mt-2 text-xs font-semibold text-gray-600">RINCIAN SPAREPART</div>
      <div className="mb-2 hidden grid-cols-[1.6fr_0.6fr_0.7fr_0.9fr_0.8fr_0.9fr_28px] gap-2 px-1 text-[11px] text-gray-400 sm:grid">
        <span>Nama Sparepart</span><span>Jml</span><span>Satuan</span><span>Harga/Satuan</span><span>Diskon</span><span>Total</span><span></span>
      </div>
      <div className="mb-2 max-h-56 space-y-2 overflow-y-auto">
        {items.map((it) => (
          <div key={it.key} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-100 p-2 sm:grid-cols-[1.6fr_0.6fr_0.7fr_0.9fr_0.8fr_0.9fr_28px] sm:items-center sm:border-0 sm:p-0">
            <input className={inputCls} placeholder="Nama sparepart" value={it.part_name} onChange={(e) => updateItem(it.key, { part_name: e.target.value })} />
            <input type="number" className={inputCls} placeholder="Jml" value={it.qty} onChange={(e) => updateItem(it.key, { qty: e.target.value })} />
            <input className={inputCls} placeholder="Satuan" value={it.unit} onChange={(e) => updateItem(it.key, { unit: e.target.value })} />
            <input type="number" className={inputCls} placeholder="Harga" value={it.unit_price} onChange={(e) => updateItem(it.key, { unit_price: e.target.value })} />
            <input type="number" className={inputCls} placeholder="Diskon" value={it.discount} onChange={(e) => updateItem(it.key, { discount: e.target.value })} />
            <div className="flex items-center justify-between text-sm font-medium text-gray-700 sm:justify-start">
              {fmtRupiah(itemTotal(it))}
              <button onClick={() => removeItem(it.key)} className="ml-2 text-red-500 hover:text-red-700 sm:ml-0" title="Hapus baris">✕</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setItems((p) => [...p, emptyItem()])} className="mb-3 text-sm font-medium text-gray-700 hover:text-gray-900">
        + Tambah Sparepart
      </button>

      <div className="mb-4 flex justify-end border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
        Total: {fmtRupiah(total)}
      </div>

      <Field label="Foto Bukti / Invoice">
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200" />
      </Field>
      <Field label="Catatan">
        <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <ModalFooter onCancel={onClose} onSave={handleSave} saving={saving} />
    </Modal>
  )
}
