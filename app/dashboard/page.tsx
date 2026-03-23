"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation" // 🌟 1. Import useRouter สำหรับทำ Redirect
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueueBoard } from "@/components/queue-board"
import { DashboardOverview } from "@/components/dashboard-overview"
import { ReportDashboard } from "@/components/report-dashboard"
import { ShopSettings } from "@/components/shop-settings"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useJobSync } from "@/hooks/useJobSync"

// 🌟 2. เพิ่ม Loader2 เข้ามาสำหรับหน้าจอโหลด
import { LayoutDashboard, ClipboardList, BarChart3, Settings, Loader2 } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-header"

// 🌟 3. Import Action ที่ทำหน้าที่เป็นยามเฝ้าประตู (เช็ควันหมดอายุ)
import { checkAndEnforceShopStatus } from "@/actions/shop-status"

// Component สำหรับสั่งให้ Sync ทำงานเบื้องหลัง
function JobSyncManager({ shopId }: { shopId: string }) {
  useJobSync(shopId)
  return null
}

export default function MainPage() {
  const router = useRouter()
  const SHOP_ID = "shop_test_001" // 🌟 กำหนดรหัสร้านค้าคงที่สำหรับการทดสอบ

  // 🌟 4. State สำหรับแสดงหน้าโหลดระหว่างที่ระบบกำลังตรวจสอบ Database
  const [isChecking, setIsChecking] = useState(true)

  // 🌟 5. ลอจิกป้องกัน (The Gatekeeper) จะทำงานทันทีที่เปิดหน้านี้ขึ้นมา
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const res = await checkAndEnforceShopStatus(SHOP_ID)
        
        // ถ้าสถานะคือ EXPIRED (หมดอายุ) หรือ PENDING_DELETION (รอการลบ)
        if (res.status === "EXPIRED" || res.status === "PENDING_DELETION") {
          // ดีดผู้ใช้ไปหน้า Paywall ทันที พร้อมแนบจำนวนวันคงเหลือก่อนลบถาวรไปใน URL
          router.push(`/paywall?daysLeft=${res.daysLeftToPurge || 0}`)
        } else {
          // ถ้าร้านค้ายังสถานะปกติ (ACTIVE) ก็ให้เข้าใช้งาน Dashboard ได้
          setIsChecking(false)
        }
      } catch (error) {
        console.error("Error checking shop status:", error)
        setIsChecking(false) // ถ้า API ขัดข้อง อนุญาตให้เข้าได้ก่อนชั่วคราว ป้องกันระบบล็อกตาย
      }
    }
    
    verifyAccess()
  }, [router, SHOP_ID])

  // 🌟 6. หน้าจอ Loading ป้องกันไม่ให้แอบเห็นข้อมูล Dashboard ระหว่างกำลังโดนดีด
  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">กำลังตรวจสอบข้อมูลร้านค้าและแพ็กเกจ...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <JobSyncManager shopId={SHOP_ID} />
      <div className="min-h-screen flex flex-col w-full bg-slate-50/30">

        {/* วาง Header ไว้บนสุดของเพจ (ปุ่มแชร์ QR Code จะอยู่ตรงนี้) */}
        <DashboardHeader />

        {/* พื้นที่เนื้อหาหลักด้านล่าง */}
        <main className="p-4 md:p-6 space-y-4 flex-1">
          <Tabs defaultValue="dashboard" className="w-full">

            {/* อัปเดต TabsTrigger เปลี่ยนจาก Emoji เป็น Lucide Icons */}
            <TabsList className="mb-4 bg-slate-100/50 border border-slate-200 flex-wrap h-auto p-1">
              <TabsTrigger value="dashboard" className="flex-1 md:flex-none flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> ภาพรวม
              </TabsTrigger>
              
              <TabsTrigger value="queue" className="flex-1 md:flex-none flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> กระดานคิว
              </TabsTrigger>
              
              <TabsTrigger value="report" className="flex-1 md:flex-none flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> รายงานสถิติ
              </TabsTrigger>
              
              <TabsTrigger value="settings" className="flex-1 md:flex-none flex items-center gap-2">
                <Settings className="w-4 h-4" /> ตั้งค่าร้านค้า
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <DashboardOverview />
            </TabsContent>

            <TabsContent value="queue" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <QueueBoard />
            </TabsContent>

            <TabsContent value="report" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <ReportDashboard />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <ShopSettings />
            </TabsContent>

          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  )
}