'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/** Bungkus halaman yang wajib login. Kalau belum login, otomatis
 * diarahkan ke '/' (tempat form login berada). Data tetap dilindungi
 * RLS di Supabase — ini cuma untuk pengalaman pemakaian yang rapi. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) router.replace('/')
      else setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-sm text-gray-500">
        Memeriksa login...
      </div>
    )
  }

  return <>{children}</>
}
