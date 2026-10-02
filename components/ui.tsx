'use client'

import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

export const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  headerActions,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  headerActions?: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={'mt-8 w-full rounded-xl bg-white shadow-xl ' + (wide ? 'max-w-2xl' : 'max-w-md')}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-3">
            {headerActions}
            <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-700">
              ×
            </button>
          </div>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function ModalFooter({
  onCancel,
  onSave,
  saving,
  saveLabel = 'Simpan',
}: {
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveLabel?: string
}) {
  return (
    <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-4">
      <button
        onClick={onCancel}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Batal
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Menyimpan...' : saveLabel}
      </button>
    </div>
  )
}

/** Layout halaman standar: sidebar + header tetap (sticky) + isi yang bisa di-scroll. */
export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white py-3 pl-16 pr-4 md:px-6 md:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900 md:text-xl">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}

/** Dropdown pilih kendaraan — dipakai di BBM, Service, Jadwal, Pajak, Laporan. */
export function VehicleSelect({
  vehicles,
  value,
  onChange,
}: {
  vehicles: { id: string; plate_number: string; name: string | null }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <select
      className={inputCls + ' max-w-xs'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {vehicles.length === 0 && <option value="">Belum ada kendaraan</option>}
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.plate_number}
          {v.name ? ` — ${v.name}` : ''}
        </option>
      ))}
    </select>
  )
}
