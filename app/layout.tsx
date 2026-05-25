import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider" // 🌟 1. นำเข้า ThemeProvider ของเรา
import { Inter, Noto_Sans_Thai } from "next/font/google"
import { CookieBanner } from '@/components/cookie-banner'

const _geistMono = Geist_Mono({ subsets: ["latin"] });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const notoThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
  display: "swap",
})

export const metadata: Metadata = {
  title: 'getfixx - จัดการคิวซ่อมออนไลน์',
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
    // 🌟 2. สำคัญมาก: ต้องใส่ suppressHydrationWarning ที่ <html> เพื่อป้องกัน Next-Themes ฟ้อง Error ตอนโหลดหน้าเว็บครั้งแรก
    <html lang="th" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoThai.variable} font-sans antialiased`} suppressHydrationWarning>

        {/* 🌟 3. เอา ThemeProvider ครอบ Component ทั้งหมดไว้ข้างนอกสุด */}
        <ThemeProvider>
          <Providers>
            {children}
            <Toaster />
            <CookieBanner />
          </Providers>
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  )
}