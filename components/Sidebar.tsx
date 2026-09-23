'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const menuItems = [
  {
    label: 'Dashboard',
    icon: '▦',
  },
  {
    label: 'Transaksi',
    icon: '⇄',
    children: ['BBM', 'Service', 'Maintenance'],
  },
  {
    label: 'Schedule',
    icon: '◷',
    children: ['Jadwal Pemeliharaan', 'Pajak / KIR'],
  },
  {
    label: 'Master',
    icon: '▤',
    children: [
      'Kendaraan',
      'Driver',
      'Bensin',
      'SPBU',
      'Workshop',
      'Maintenance',
      'Tipe Service',
      'Satuan',
    ],
  },
  {
    label: 'Laporan',
    icon: '▥',
  },
]

export default function Sidebar() {
  const [openMenu, setOpenMenu] = useState<string | null>('Transaksi')
  const router = useRouter()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-5">
        <h1 className="text-lg font-bold text-gray-900">
          Pemeliharaan
        </h1>

        <p className="text-sm text-gray-500">
          Kendaraan
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuItems.map((item) => {
          const hasChildren = Boolean(item.children)
          const isOpen = openMenu === item.label

          return (
            <div key={item.label} className="mb-1">
              <button
                type="button"
                onClick={() =>
                  hasChildren
                    ? setOpenMenu(isOpen ? null : item.label)
                    : setOpenMenu(null)
                }
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                <span className="flex items-center gap-3">
                  <span className="w-5 text-center text-gray-500">
                    {item.icon}
                  </span>

                  {item.label}
                </span>

                {hasChildren && (
                  <span className="text-xs text-gray-400">
                    {isOpen ? '⌃' : '⌄'}
                  </span>
                )}
              </button>

              {hasChildren && isOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children?.map((child) => (
  <button
    key={child}
    type="button"
    onClick={() => {
      if (child === 'Kendaraan') {
        router.push('/kendaraan')
      }
    }}
    className="block w-full rounded-md px-3 py-2 text-left text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
  >
    {child}
  </button>
))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="rounded-lg bg-gray-50 px-3 py-3">
          <p className="text-xs font-medium text-gray-500">
            Vehicle Management
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Version 1.0
          </p>
        </div>
      </div>
    </aside>
  )
}