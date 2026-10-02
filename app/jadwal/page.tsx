'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthGate from '@/components/AuthGate'
import { Field, Modal, ModalFooter, PageShell, VehicleSelect, inputCls } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useVehicles } from '@/lib/hooks'
import { fmtDate, fmtNumber, todayISO } from '@/lib/utils'
import { kmStatus } from '@/lib/reminders'
import type { FuelLog, MaintenanceSchedule, MaintenanceType, ServiceLog } from '@/lib/types'

export default function JadwalPage() {
  return (
    <AuthGate>
      <JadwalContent />
    </AuthGate>
  )
}

function JadwalContent() {
  const { vehicles, vehicleId, setVehicleId } = useVehicles()
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [types, setTypes] = useState<MaintenanceType[]>([])
  const [currentOdo, setCurrentOdo] = useState(0)
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [doneTarget, setDoneTarget] = useState<MaintenanceSchedule | null>(null)

  const load = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    const [schedRes, typeRes, fuelRes, serviceRes] = await Promise.all([
      supabase.from('maintenance_schedules').select('*').eq('vehicle_id', vehicleId),
      supabase.from('maintenance_types').select('*').order('name'),
      supabase.from('fuel_logs').select('odometer').eq('vehicle_id', vehicleId),
      supabase.from('service_logs').select('odometer').eq('vehicle_id', vehicleId),
    ])
    setSchedules((schedRes.data || []) as MaintenanceSchedule[])
    setTypes((typeRes.data || []) as MaintenanceType[])

    const odoValues = [
      ...((fuelRes.data || []) as FuelLog[]).map((f) => Number(f.odometer)),
      ...((serviceRes.data || []) as ServiceLog[]).map((s) => Number(s.odometer || 0)),
    ]
    setCurrentOdo(odoValues.length ? Math.max(...odoValues) : 0)
    setLoading(false)
  }, [vehicleId])

  useEffect(() => {
    load()
  }, [load])

  const typeName = useCallback((id: string) => types.find((t) => t.id === id)?.name || '—', [types])

  const rows = useMemo(
    () =>
      schedules.map((s) => {
        const status =
          s.last_done_odometer != null && s.interval_km
            ? kmStatus(currentOdo, s.last_done_odometer, s.interval_km)
            : null
        return { schedule: s, status }
      }),
    [schedules, currentOdo]
  )

  async function markDone(s: MaintenanceSchedule, date: string, odo: string) {
    const { error } = await supabase
      .from('maintenance_schedules')
      .update({ last_done_date: date, last_done_odometer: odo ? Number(odo) : null })
      .eq('id', s.id)
    if (error) return alert('Gagal menyimpan: ' + error.message)
    setDoneTarget(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus jadwal ini?')) return
    const { error } = await supabase.from('maintenance_schedules').delete().eq('id', id)
    if (error) return alert('Gagal menghapus: ' + error.message)
    load()
  }

  return (
    <PageShell
      title="Jadwal Pemeliharaan"
      subtitle="Reminder berdasarkan Jenis Perawatan — tandai selesai untuk reset hitungan"
      actions={
        <>
          <VehicleSelect vehicles={vehicles} value={vehicleId} onChange={setVehicleId} />
          <button
            onClick={() => setFormOpen(true)}
            disabled={!vehicleId}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            + Tambah Jadwal
          </button>
        </>
      }
    >
      {vehicleId && (
        <div className="space-y-3">
          {loading && <div className="text-sm text-gray-400">Memuat…</div>}
          {!loading && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Belum ada jadwal pemeliharaan untuk kendaraan ini.
            </div>
          )}
          {rows.map(({ schedule, status }) => (
            <div
              key={schedule.id}
              className={
                'rounded-xl border bg-white p-4 ' +
                (status?.overdue ? 'border-red-200' : status?.near ? 'border-amber-200' : 'border-gray-200')
              }
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900">{typeName(schedule.maintenance_type_id)}</div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setDoneTarget(schedule)} className="font-medium text-gray-700 hover:text-gray-900">
                    ✓ Tandai Selesai
                  </button>
                  <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:text-red-800">Hapus</button>
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {schedule.interval_km ? `Tiap ${fmtNumber(schedule.interval_km, 0)} km` : ''}
                {schedule.interval_km && schedule.interval_month ? ' · ' : ''}
                {schedule.interval_month ? `Tiap ${schedule.interval_month} bulan` : ''}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Terakhir: {schedule.last_done_date ? fmtDate(schedule.last_done_date) : 'Belum pernah'}
                {schedule.last_done_odometer ? ` · ${fmtNumber(schedule.last_done_odometer, 0)} km` : ''}
              </div>
              {status && (
                <div className={'mt-2 text-sm font-medium ' + (status.overdue ? 'text-red-600' : status.near ? 'text-amber-600' : 'text-green-700')}>
                  {status.label}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && vehicleId && (
        <ScheduleForm vehicleId={vehicleId} types={types} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load() }} />
      )}

      {doneTarget && (
        <MarkDoneForm
          currentOdo={currentOdo}
          onCancel={() => setDoneTarget(null)}
          onConfirm={(date, odo) => markDone(doneTarget, date, odo)}
        />
      )}
    </PageShell>
  )
}

function ScheduleForm({
  vehicleId,
  types,
  onClose,
  onSaved,
}: {
  vehicleId: string
  types: MaintenanceType[]
  onClose: () => void
  onSaved: () => void
}) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? '')
  const [intervalKm, setIntervalKm] = useState('5000')
  const [intervalMonth, setIntervalMonth] = useState('')
  const [lastDate, setLastDate] = useState(todayISO())
  const [lastOdo, setLastOdo] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!typeId) return alert('Pilih jenis perawatan dulu (tambahkan di Master kalau belum ada).')
    if (!intervalKm && !intervalMonth) return alert('Isi minimal salah satu: interval KM atau interval bulan.')
    setSaving(true)
    const { error } = await supabase.from('maintenance_schedules').insert({
      vehicle_id: vehicleId,
      maintenance_type_id: typeId,
      interval_km: intervalKm ? Number(intervalKm) : null,
      interval_month: intervalMonth ? Number(intervalMonth) : null,
      last_done_date: lastDate || null,
      last_done_odometer: lastOdo ? Number(lastOdo) : null,
    })
    if (error) {
      alert('Gagal menyimpan: ' + error.message)
      setSaving(false)
      return
    }
    onSaved()
  }

  return (
    <Modal title="Tambah Jadwal Pemeliharaan" onClose={onClose}>
      <Field label="Jenis Perawatan">
        <select className={inputCls} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          {types.length === 0 && <option value="">Belum ada — tambah di Master</option>}
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Interval KM"><input type="number" className={inputCls} value={intervalKm} onChange={(e) => setIntervalKm(e.target.value)} /></Field>
        <Field label="Interval Bulan (opsional)"><input type="number" className={inputCls} value={intervalMonth} onChange={(e) => setIntervalMonth(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Terakhir Dilakukan"><input type="date" className={inputCls} value={lastDate} onChange={(e) => setLastDate(e.target.value)} /></Field>
        <Field label="Odometer Saat Itu"><input type="number" className={inputCls} value={lastOdo} onChange={(e) => setLastOdo(e.target.value)} /></Field>
      </div>
      <ModalFooter onCancel={onClose} onSave={handleSave} saving={saving} />
    </Modal>
  )
}

function MarkDoneForm({
  currentOdo,
  onCancel,
  onConfirm,
}: {
  currentOdo: number
  onCancel: () => void
  onConfirm: (date: string, odo: string) => void
}) {
  const [date, setDate] = useState(todayISO())
  const [odo, setOdo] = useState(currentOdo ? String(currentOdo) : '')
  const [saving, setSaving] = useState(false)

  return (
    <Modal title="Tandai Selesai" onClose={onCancel}>
      <Field label="Tanggal Selesai"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Odometer Saat Ini"><input type="number" className={inputCls} value={odo} onChange={(e) => setOdo(e.target.value)} /></Field>
      <ModalFooter
        onCancel={onCancel}
        saving={saving}
        saveLabel="Tandai Selesai"
        onSave={() => {
          setSaving(true)
          onConfirm(date, odo)
        }}
      />
    </Modal>
  )
}
