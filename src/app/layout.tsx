import type { Metadata } from 'next'
import { Inter, Lato, Bebas_Neue } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--fh-font-heading-loaded',
  display: 'swap',
})

const lato = Lato({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--fh-font-body-loaded',
  display: 'swap',
})

const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--fh-font-wordmark-loaded',
  display: 'swap',
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
    <html
      lang="pt-BR"
      className={`${inter.variable} ${lato.variable} ${bebas.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
