import type { Metadata } from 'next'
import { Fraunces, Lato } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-fraunces',
})

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
})

export const metadata: Metadata = {
  title: 'Flag Haus',
  description: 'Estúdio de tatuagem autoral — Julio Bandeiras',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${lato.variable}`}>
      <body>{children}</body>
    </html>
  )
}
