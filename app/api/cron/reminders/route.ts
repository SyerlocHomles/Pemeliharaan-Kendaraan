import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET belum dikonfigurasi.' },
      { status: 500 }
    )
  }

  const auth = request.headers.get('authorization')

  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          'NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.',
      },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    serviceRoleKey
  )

  const lines: string[] = []

  /*
   * ============================
   * DATA KENDARAAN
   * ============================
   */

  const { data: vehicles, error: vehiclesError } =
    await supabaseAdmin
      .from('vehicles')
      .select('id, name, plate_number, status')

  if (vehiclesError) {
    return NextResponse.json(
      {
        error: 'Gagal mengambil data kendaraan.',
        detail: vehiclesError.message,
      },
      { status: 500 }
    )
  }

  /*
   * ============================
   * MAINTENANCE SCHEDULE
   * ============================
   */

  const { data: schedules, error: schedulesError } =
    await supabaseAdmin
      .from('maintenance_schedules')
      .select(`
        id,
        vehicle_id,
        maintenance_type_id,
        km_interval,
        day_interval,
        last_completed_date,
        last_completed_odometer,
        next_due_date,
        next_due_odometer,
        reminder_days_before,
        reminder_km_before,
        status
      `)

  if (schedulesError) {
    return NextResponse.json(
      {
        error: 'Gagal mengambil jadwal maintenance.',
        detail: schedulesError.message,
      },
      { status: 500 }
    )
  }

  /*
   * ============================
   * MAINTENANCE TYPE
   * ============================
   */

  const { data: types, error: typesError } =
    await supabaseAdmin
      .from('maintenance_types')
      .select('id, name')

  if (typesError) {
    return NextResponse.json(
      {
        error: 'Gagal mengambil tipe maintenance.',
        detail: typesError.message,
      },
      { status: 500 }
    )
  }

  /*
   * ============================
   * DOKUMEN PAJAK / KIR
   * ============================
   */

  const { data: documents, error: documentsError } =
    await supabaseAdmin
      .from('vehicle_documents')
      .select(`
        id,
        vehicle_id,
        document_type,
        document_number,
        due_date,
        status
      `)

  if (documentsError) {
    return NextResponse.json(
      {
        error: 'Gagal mengambil dokumen kendaraan.',
        detail: documentsError.message,
      },
      { status: 500 }
    )
  }

  /*
   * ============================
   * TRANSAKSI BBM
   * ============================
   */

  const { data: fuelTransactions, error: fuelError } =
    await supabaseAdmin
      .from('fuel_transactions')
      .select('vehicle_id, odometer, transaction_date')
      .order('transaction_date', { ascending: false })

  if (fuelError) {
    return NextResponse.json(
      {
        error: 'Gagal mengambil transaksi BBM.',
        detail: fuelError.message,
      },
      { status: 500 }
    )
  }

  /*
   * ============================
   * HELPER
   * ============================
   */

  const vehicleLabel = (vehicleId: string) => {
    const vehicle = vehicles?.find((v) => v.id === vehicleId)

    if (!vehicle) {
      return vehicleId
    }

    return vehicle.name
      ? `${vehicle.plate_number} - ${vehicle.name}`
      : vehicle.plate_number
  }

  const typeName = (typeId: string) => {
    return (
      types?.find((type) => type.id === typeId)?.name ||
      'Perawatan'
    )
  }

  const currentOdometer = (vehicleId: string) => {
    const rows = (fuelTransactions || []).filter(
      (transaction) => transaction.vehicle_id === vehicleId
    )

    if (!rows.length) {
      return null
    }

    return Math.max(
      ...rows.map((row) => Number(row.odometer || 0))
    )
  }

  /*
   * ============================
   * CHECK MAINTENANCE
   * ============================
   */

  const today = new Date()

  ;(schedules || []).forEach((schedule) => {
    if (schedule.status === 'inactive') {
      return
    }

    const currentOdo = currentOdometer(schedule.vehicle_id)

    /*
     * Reminder berdasarkan KM
     */

    if (
      currentOdo !== null &&
      schedule.next_due_odometer !== null &&
      schedule.next_due_odometer !== undefined
    ) {
      const remainingKm =
        Number(schedule.next_due_odometer) - currentOdo

      const reminderKm =
        Number(schedule.reminder_km_before || 0)

      if (remainingKm <= reminderKm) {
        lines.push(
          `${vehicleLabel(schedule.vehicle_id)} — ${typeName(
            schedule.maintenance_type_id
          )}: ${
            remainingKm <= 0
              ? `SUDAH LEWAT ${Math.abs(remainingKm)} km`
              : `${remainingKm} km lagi`
          }`
        )
      }
    }

    /*
     * Reminder berdasarkan tanggal
     */

    if (schedule.next_due_date) {
      const dueDate = new Date(
        `${schedule.next_due_date}T00:00:00`
      )

      const daysRemaining = Math.ceil(
        (dueDate.getTime() - today.getTime()) /
          86400000
      )

      const reminderDays =
        Number(schedule.reminder_days_before || 0)

      if (daysRemaining <= reminderDays) {
        lines.push(
          `${vehicleLabel(schedule.vehicle_id)} — ${typeName(
            schedule.maintenance_type_id
          )}: ${
            daysRemaining <= 0
              ? `SUDAH LEWAT dari ${schedule.next_due_date}`
              : `${daysRemaining} hari lagi (${schedule.next_due_date})`
          }`
        )
      }
    }
  })

  /*
   * ============================
   * CHECK PAJAK / KIR
   * ============================
   */

  ;(documents || []).forEach((document) => {
    if (!document.due_date) {
      return
    }

    const dueDate = new Date(
      `${document.due_date}T00:00:00`
    )

    const daysRemaining = Math.ceil(
      (dueDate.getTime() - today.getTime()) /
        86400000
    )

    /*
     * Reminder default 30 hari.
     */

    if (daysRemaining <= 30) {
      lines.push(
        `${vehicleLabel(document.vehicle_id)} — ${
          document.document_type
        }: ${
          daysRemaining <= 0
            ? `SUDAH LEWAT dari ${document.due_date}`
            : `${daysRemaining} hari lagi (${document.due_date})`
        }`
      )
    }
  })

  /*
   * ============================
   * TIDAK ADA REMINDER
   * ============================
   */

  if (lines.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: false,
      message: 'Tidak ada reminder yang perlu dikirim.',
    })
  }

  /*
   * ============================
   * EMAIL
   * ============================
   */

  const resendApiKey = process.env.RESEND_API_KEY
  const toEmail = process.env.REMINDER_EMAIL_TO

  if (!resendApiKey || !toEmail) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reminderCount: lines.length,
      reminders: lines,
      message:
        'Reminder ditemukan, tetapi pengiriman email belum dikonfigurasi.',
    })
  }

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:
          process.env.REMINDER_EMAIL_FROM ||
          'Pemeliharaan Kendaraan <onboarding@resend.dev>',
        to: [toEmail],
        subject:
          'Reminder Pemeliharaan Kendaraan',
        text: lines.join('\n'),
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text()

    return NextResponse.json(
      {
        ok: false,
        message: `Gagal mengirim email: ${body}`,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    count: lines.length,
    reminders: lines,
  })
}