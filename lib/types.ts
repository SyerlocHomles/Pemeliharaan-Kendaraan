// Tipe data yang cocok dengan sql/schema.sql — dipakai di seluruh app
// supaya konsisten dan dapat autocomplete/type-check dari TypeScript.

export type Vehicle = {
  id: string
  plate_number: string
  name: string | null
  interval_service_km: number
  interval_service_month: number
  created_at: string
}

export type FuelType = {
  id: string
  name: string
  created_at: string
}

export type FuelPrice = {
  id: string
  fuel_type_id: string
  price_per_liter: number
  effective_date: string
  created_at: string
}

export type FuelLog = {
  id: string
  vehicle_id: string
  log_date: string
  log_time: string | null
  driver_name: string | null
  station: string | null
  odometer: number
  liters: number | null
  fuel_type_id: string | null
  price_per_liter: number
  total_cost: number
  mileage: number | null
  km_per_liter: number | null
  photo_url: string | null
  created_at: string
}

export type MaintenanceType = {
  id: string
  name: string
  created_at: string
}

export type ServiceLog = {
  id: string
  vehicle_id: string
  log_date: string
  invoice_number: string | null
  workshop: string | null
  maintenance_type_id: string | null
  odometer: number | null
  total_cost: number
  photo_url: string | null
  notes: string | null
  created_at: string
}

export type ServiceItem = {
  id: string
  service_log_id: string
  part_name: string
  qty: number
  unit: string | null
  unit_price: number
  discount: number
  total: number
}

export type MaintenanceSchedule = {
  id: string
  vehicle_id: string
  maintenance_type_id: string
  interval_km: number | null
  interval_month: number | null
  last_done_date: string | null
  last_done_odometer: number | null
  created_at: string
}

export type TaxReminder = {
  id: string
  vehicle_id: string
  name: string
  due_date: string
  interval_month: number | null
  last_cost: number | null
  created_at: string
}
