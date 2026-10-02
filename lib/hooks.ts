'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Vehicle } from './types'

const STORAGE_KEY = 'selectedVehicleId'

/** Ambil daftar kendaraan dan ingat kendaraan yang terakhir dipilih,
 * jadi pindah halaman (BBM → Service → dst) tidak perlu pilih ulang. */
export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehicleId, setVehicleIdState] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('vehicles')
      .select('*')
      .order('created_at')
      .then(({ data }) => {
        if (!active) return
        const list = (data || []) as Vehicle[]
        setVehicles(list)
        const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
        const initial = list.find((v) => v.id === saved)?.id || list[0]?.id || ''
        setVehicleIdState(initial)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const setVehicleId = useCallback((id: string) => {
    setVehicleIdState(id)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, id)
  }, [])

  return { vehicles, vehicleId, setVehicleId, loading }
}
