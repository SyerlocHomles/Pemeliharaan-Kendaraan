export type ReminderStatus = {
  overdue: boolean
  near: boolean
  label: string
}

/** Reminder berbasis KM: bandingkan odometer terakhir kendaraan dengan
 * target (odometer terakhir servis + interval). */
export function kmStatus(currentOdo: number, lastOdo: number, intervalKm: number): ReminderStatus {
  const target = lastOdo + intervalKm
  const remaining = target - currentOdo
  return {
    overdue: remaining <= 0,
    near: remaining > 0 && remaining <= 300,
    label:
      remaining <= 0
        ? `Sudah lewat ${Math.abs(remaining).toLocaleString('id-ID')} km`
        : `${remaining.toLocaleString('id-ID')} km lagi (target ${target.toLocaleString('id-ID')} km)`,
  }
}

/** Reminder berbasis tanggal jatuh tempo langsung (bukan interval). */
export function dateStatus(dueDateISO: string): ReminderStatus {
  const due = new Date(dueDateISO)
  const remainingDays = Math.round((due.getTime() - Date.now()) / 86400000)
  return {
    overdue: remainingDays <= 0,
    near: remainingDays > 0 && remainingDays <= 30,
    label:
      remainingDays <= 0
        ? `Sudah lewat dari ${due.toLocaleDateString('id-ID')}`
        : `${remainingDays} hari lagi (jatuh tempo ${due.toLocaleDateString('id-ID')})`,
  }
}
