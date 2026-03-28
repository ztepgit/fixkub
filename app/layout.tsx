import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/toaster" 
import { Providers } from "@/components/providers" // 🌟 1. Import Providers ที่เราสร้างขึ้นมาใหม่
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'esyQ - Queue Management Dashboard',
  description: 'Simple queue management for local shops',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        {/* 🌟 2. เอา Providers ครอบ {children} และ Component อื่นๆ ที่ต้องการใช้งาน */}
        <Providers>
          {children}
          <Toaster /> 
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}