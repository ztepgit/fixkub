"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { usePathname } from "next/navigation"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname();

  // 🌟 กำหนด Routes ที่อนุญาตให้ใช้ Dark Mode ได้
  // ถ้าพาทขึ้นต้นด้วย /dashboard จะอนุญาตให้ผู้ใช้สลับโหมดได้
  const allowDarkMode = pathname?.startsWith("/dashboard") || pathname?.startsWith("/super-admin");

  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="system" // ค่าเริ่มต้นสำหรับ Dashboard คือ System
      enableSystem={true}
      // 🌟 ไม้ตาย: ถ้าไม่ใช่หน้า Dashboard ให้บังคับเป็น Light Mode ทันที (No Flicker)
      forcedTheme={allowDarkMode ? undefined : "light"}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}