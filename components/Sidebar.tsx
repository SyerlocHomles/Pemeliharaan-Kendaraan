'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/bbm', label: 'BBM' },
  { href: '/service', label: 'Service' },
  { href: '/jadwal', label: 'Jadwal Pemeliharaan' },
  { href: '/pajak', label: 'Pajak / KIR' },
  { href: '/master', label: 'Master' },
  { href: '/laporan', label: 'Laporan / Statistik' },
]

function Brand() {
  return (
    <div className="border-b border-gray-200 px-5 py-5">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">Sistem</div>
      <div className="text-base font-bold text-gray-900">Pemeliharaan Kendaraan</div>
    </div>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              'block border-l-2 px-5 py-2.5 text-sm font-medium transition-colors ' +
              (active
                ? 'border-gray-900 bg-gray-100 text-gray-900'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900')
            }
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function LogoutButton() {
  const router = useRouter()
  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/')
  }
  return (
    <div className="border-t border-gray-200 p-4">
      <button
        onClick={handleLogout}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
      >
        Logout
      </button>
    </div>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop / laptop: sidebar tetap di kiri, tidak ikut ter-scroll */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start border-r border-gray-200 bg-white md:flex">
        <Brand />
        <NavList />
        <LogoutButton />
      </aside>

      {/* HP: tombol menu mengambang + drawer geser dari kiri */}
      <button
        aria-label="Buka menu"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg text-gray-700 shadow-sm md:hidden"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <Brand />
            <NavList onNavigate={() => setOpen(false)} />
            <LogoutButton />
          </aside>
        </div>
      )}
    </>
  )
}
