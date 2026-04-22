import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import './global.css'

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Codenames — Multiplayer',
  description: 'Jogue Codenames online com seus amigos em tempo real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={spaceMono.variable}>
      <body className="bg-[#0d0f14] text-white antialiased">{children}</body>
    </html>
  )
}
