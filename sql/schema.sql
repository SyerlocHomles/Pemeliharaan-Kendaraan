-- =============================================================
-- SCHEMA: Tracking Pemeliharaan Kendaraan
-- Jalankan seluruh file ini di Supabase → SQL Editor → Run
-- Aman dijalankan berkali-kali (pakai "if not exists" / "on conflict")
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- MASTER: Kendaraan (Plat Kendaraan)
-- -------------------------------------------------------------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null,
  name text,
  interval_service_km integer default 3000,
  interval_service_month integer default 6,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------
-- MASTER: Jenis BBM
-- -------------------------------------------------------------
create table if not exists fuel_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Riwayat harga BBM — edit harga = tambah baris baru, baris lama
-- TIDAK berubah (sesuai permintaan: histori harga lama tetap terjaga)
create table if not exists fuel_prices (
  id uuid primary key default gen_random_uuid(),
  fuel_type_id uuid references fuel_types(id) on delete cascade,
  price_per_liter numeric(12,2) not null,
  effective_date date not null default current_date,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------
-- BBM — transaksi pengisian bensin
-- -------------------------------------------------------------
create table if not exists fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  log_date date not null,
  log_time time,
  driver_name text,
  station text,
  odometer numeric not null,
  liters numeric,
  fuel_type_id uuid references fuel_types(id),
  price_per_liter numeric(12,2) not null,  -- snapshot harga saat itu, bukan live-join
  total_cost numeric(12,2) not null,
  mileage numeric,        -- jarak sejak isi sebelumnya (dihitung otomatis)
  km_per_liter numeric,   -- konsumsi (dihitung otomatis)
  photo_url text,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------
-- MASTER: Jenis Perawatan (dipakai di Service & Jadwal Pemeliharaan)
-- -------------------------------------------------------------
create table if not exists maintenance_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------
-- SERVICE — transaksi ke bengkel (invoice + rincian sparepart)
-- -------------------------------------------------------------
create table if not exists service_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  log_date date not null,
  invoice_number text,
  workshop text,
  maintenance_type_id uuid references maintenance_types(id),
  odometer numeric,
  total_cost numeric(12,2) not null default 0,
  photo_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists service_items (
  id uuid primary key default gen_random_uuid(),
  service_log_id uuid references service_logs(id) on delete cascade,
  part_name text not null,
  qty numeric not null default 1,
  unit text,
  unit_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0
);

-- -------------------------------------------------------------
-- JADWAL PEMELIHARAAN — reminder berbasis Jenis Perawatan
-- -------------------------------------------------------------
create table if not exists maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  maintenance_type_id uuid references maintenance_types(id),
  interval_km integer,
  interval_month integer,
  last_done_date date,
  last_done_odometer numeric,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------
-- PAJAK / KIR — reminder tanggal jatuh tempo
-- -------------------------------------------------------------
create table if not exists tax_reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  name text not null,           -- "Pajak Tahunan", "KIR", dst
  due_date date not null,
  interval_month integer,       -- kosongkan kalau cuma sekali, isi kalau berulang otomatis
  last_cost numeric(12,2),
  created_at timestamptz default now()
);

-- =============================================================
-- ROW LEVEL SECURITY — wajib login untuk akses data apa pun
-- =============================================================
alter table vehicles enable row level security;
alter table fuel_types enable row level security;
alter table fuel_prices enable row level security;
alter table fuel_logs enable row level security;
alter table maintenance_types enable row level security;
alter table service_logs enable row level security;
alter table service_items enable row level security;
alter table maintenance_schedules enable row level security;
alter table tax_reminders enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'vehicles','fuel_types','fuel_prices','fuel_logs','maintenance_types',
    'service_logs','service_items','maintenance_schedules','tax_reminders'
  ]
  loop
    execute format('drop policy if exists "auth_all" on %I;', t);
    execute format(
      'create policy "auth_all" on %I for all using (auth.uid() is not null) with check (auth.uid() is not null);',
      t
    );
  end loop;
end $$;

-- =============================================================
-- STORAGE — bucket untuk foto bukti (struk BBM, invoice service)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

drop policy if exists "auth read evidence" on storage.objects;
drop policy if exists "auth upload evidence" on storage.objects;
drop policy if exists "auth delete evidence" on storage.objects;

create policy "auth read evidence" on storage.objects
  for select using (bucket_id = 'evidence' and auth.uid() is not null);
create policy "auth upload evidence" on storage.objects
  for insert with check (bucket_id = 'evidence' and auth.uid() is not null);
create policy "auth delete evidence" on storage.objects
  for delete using (bucket_id = 'evidence' and auth.uid() is not null);

-- =============================================================
-- DATA AWAL (contoh, boleh dihapus/diubah langsung di Table Editor)
-- =============================================================
insert into fuel_types (name) values ('Pertalite'), ('Pertamax'), ('Pertamax Turbo'), ('Solar')
  on conflict (name) do nothing;

insert into maintenance_types (name) values
  ('Ganti Oli'), ('Ganti Ban'), ('Pompa Ban'), ('Tambal Ban'), ('Servis Rutin'), ('Servis Besar')
  on conflict (name) do nothing;
