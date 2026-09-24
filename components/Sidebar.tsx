'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  function handleMenuClick(label: string, hasChildren: boolean) {
    if (hasChildren) {
      setOpenMenu(openMenu === label ? null : label)
      return
    }

    if (label === 'Dashboard') {
      router.push('/')
      setMobileOpen(false)
      return
    }

    setOpenMenu(null)
  }

  function handleChildClick(child: string) {
    if (child === 'Kendaraan') {
      router.push('/kendaraan')
      setMobileOpen(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center border-b border-gray-200 bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-gray-700 transition hover:bg-gray-100"
        >
          ☰
        </button>

        <div className="ml-3">
          <h1 className="text-base font-bold text-gray-900">
            Pemeliharaan
          </h1>

          <p className="text-xs text-gray-500">
            Kendaraan
          </p>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r
          border-gray-200 bg-white shadow-xl transition-transform duration-300
          ease-in-out md:static md:z-auto md:h-screen md:w-64 md:shrink-0
          md:translate-x-0 md:shadow-none
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-5">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Pemeliharaan
            </h1>

            <p className="text-sm text-gray-500">
              Kendaraan
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 md:hidden"
          >
            ✕
          </button>
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
                    handleMenuClick(item.label, hasChildren)
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
                        onClick={() => handleChildClick(child)}
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

        {/* Account / Logout */}
        <div className="border-t border-gray-200 p-4">
          {userEmail && (
            <p className="mb-3 truncate px-1 text-xs text-gray-500">
              {userEmail}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
          >
            Logout
          </button>

          <div className="mt-3 rounded-lg bg-gray-50 px-3 py-3">
            <p className="text-xs font-medium text-gray-500">
              Vehicle Management
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Version 1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
