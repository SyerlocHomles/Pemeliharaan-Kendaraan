'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthGate from '@/components/AuthGate'
import { Field, Modal, ModalFooter, PageShell, VehicleSelect, inputCls } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useVehicles } from '@/lib/hooks'
import { fmtRupiah, todayISO } from '@/lib/utils'
import { dateStatus } from '@/lib/reminders'
import type { TaxReminder } from '@/lib/types'

export default function PajakPage() {
  return (
    <AuthGate>
      <PajakContent />
    </AuthGate>
  )
}

function PajakContent() {
  const { vehicles, vehicleId, setVehicleId } = useVehicles()
  const [items, setItems] = useState<TaxReminder[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [doneTarget, setDoneTarget] = useState<TaxReminder | null>(null)

  const load = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    const { data } = await supabase.from('tax_reminders').select('*').eq('vehicle_id', vehicleId).order('due_date')
    setItems((data || []) as TaxReminder[])
    setLoading(false)
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => items.map((i) => ({ item: i, status: dateStatus(i.due_date) })), [items])

  async function handleDelete(id: string) {
    if (!confirm('Hapus reminder ini?')) return
    const { error } = await supabase.from('tax_reminders').delete().eq('id', id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    load()
  }

  async function markPaid(item: TaxReminder, cost: string) {
    // Kalau berulang (interval_month diisi), majukan jatuh tempo otomatis.
    // Kalau sekali saja, cukup update biaya terakhir & biarkan tanggalnya (sudah lewat = riwayat).
    const nextDue = item.interval_month
      ? (() => {
          const d = new Date(item.due_date)
          d.setMonth(d.getMonth() + item.interval_month!)
          return d.toISOString().slice(0, 10)
        })()
      : item.due_date

    const { error } = await supabase
      .from('tax_reminders')
      .update({ due_date: nextDue, last_cost: cost ? Number(cost) : null })
      .eq('id', item.id)
    if (error) return alert('Gagal menyimpan: ' + error.message)
    setDoneTarget(null)
    load()
  }

  return (
    <PageShell
      title="Pajak / KIR"
      subtitle="Reminder jatuh tempo pembayaran"
      actions={
        <>
          <VehicleSelect vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
          <button
            onClick={() => setFormOpen(true)}
            disabled={!vehicleId}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            + Tambah Reminder
          </button>
        </>
      }
    >
      {vehicleId && (
        <div className="space-y-3">
          {loading && <div className="text-sm text-gray-400">Memuat…</div>}
          {!loading && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Belum ada reminder Pajak/KIR untuk kendaraan ini.
            </div>
          )}
          {rows.map(({ item, status }) => (
            <div
              key={item.id}
              className={
                'rounded-xl border bg-white p-4 ' +
                (status.overdue ? 'border-red-200' : status.near ? 'border-amber-200' : 'border-gray-200')
              }
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">{item.name}</div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setDoneTarget(item)} className="font-medium text-gray-700 hover:text-gray-900">✓ Tandai Dibayar</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                </div>
              </div>
              {item.last_cost != null && (
                <div className="mt-1 text-sm text-gray-500">Biaya terakhir: {fmtRupiah(item.last_cost)}</div>
              )}
              <div className={'mt-2 text-sm font-medium ' + (status.overdue ? 'text-red-600' : status.near ? 'text-amber-600' : 'text-green-700')}>
                {status.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && vehicleId && (
        <ReminderForm vehicleId={vehicleId} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load() }} />
      )}

      {doneTarget && (
        <PaidForm onCancel={() => setDoneTarget(null)} onConfirm={(cost) => markPaid(doneTarget, cost)} />
      )}
    </PageShell>
  )
}

function ReminderForm({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [repeat, setRepeat] = useState(false)
  const [intervalMonth, setIntervalMonth] = useState('12')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return alert('Nama wajib diisi.')
    if (!dueDate) return alert('Tanggal jatuh tempo wajib diisi.')
    setSaving(true)
    const { error } = await supabase.from('tax_reminders').insert({
      vehicle_id: vehicleId,
      name: name.trim(),
      due_date: dueDate,
      interval_month: repeat ? Number(intervalMonth) : null,
    })
    if (error) {
      alert('Gagal menyimpan: ' + error.message)
      setSaving(false)
      return
    }
    onSaved()
  }

  return (
    <Modal title="Tambah Reminder Pajak/KIR" onClose={onClose}>
      <Field label="Nama">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Pajak Tahunan, KIR" />
      </Field>
      <Field label="Tanggal Jatuh Tempo">
        <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
        Berulang otomatis
      </label>
      {repeat && (
        <Field label="Setiap Berapa Bulan">
          <input type="number" className={inputCls} value={intervalMonth} onChange={(e) => setIntervalMonth(e.target.value)} />
        </Field>
      )}
      <ModalFooter onCancel={onClose} onSave={handleSave} saving={saving} />
    </Modal>
  )
}

function PaidForm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (cost: string) => void }) {
  const [cost, setCost] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Modal title="Tandai Dibayar" onClose={onCancel}>
      <Field label="Biaya (opsional)">
        <input type="number" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Rp" />
      </Field>
      <ModalFooter
        onCancel={onCancel}
        saving={saving}
        saveLabel="Tandai Dibayar"
        onSave={() => {
          setSaving(true)
          onConfirm(cost)
        }}
      />
    </Modal>
  )
}
