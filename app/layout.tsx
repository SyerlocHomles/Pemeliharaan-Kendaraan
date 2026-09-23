import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pemeliharaan Kendaraan',
  description: 'Vehicle Maintenance & Expense Management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}