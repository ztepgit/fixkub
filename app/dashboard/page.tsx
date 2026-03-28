"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation" 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueueBoard } from "@/components/queue-board"
import { DashboardOverview } from "@/components/dashboard-overview"
import { ReportDashboard } from "@/components/report-dashboard"
import { ShopSettings } from "@/components/shop-settings"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useJobSync } from "@/hooks/useJobSync"

import { LayoutDashboard, ClipboardList, BarChart3, Settings, Loader2 } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-header"
import { SubscriptionBanner } from "@/components/subscription-banner" 
import { checkAndEnforceShopStatus } from "@/actions/shop-status"

// 🌟 1. Import เพิ่มเติมสำหรับการดึงข้อมูลผู้ใช้และร้านค้า
import { supabase } from "@/lib/supabase"
import { getUserShops } from "@/actions/shop"

function JobSyncManager({ shopId }: { shopId: string }) {
  useJobSync(shopId)
  return null
}

export default function MainPage() {
  const router = useRouter()
  
  // 🌟 2. เปลี่ยนมาใช้ State สำหรับเก็บ shopId ของจริง (เอา Hardcode "shop_test_001" ออก)
  const [shopId, setShopId] = useState<string | null>(null)
  
  const [isChecking, setIsChecking] = useState(true)
  const [expiresAt, setExpiresAt] = useState<Date | string | null>(null)
  
  const [activeTab, setActiveTab] = useState("dashboard")

  const tabNames: Record<string, string> = {
    dashboard: "ภาพรวม",
    queue: "กระดานคิว",
    report: "รายงานสถิติ",
    settings: "ตั้งค่าร้านค้า",
  }

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // 🌟 3. ดึงข้อมูล User ปัจจุบันที่ล็อกอินอยู่
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
          router.push('/login')
          return
        }

        // 🌟 4. ค้นหาร้านค้าที่ผูกกับอีเมลนี้ผ่าน Server Action
        const shopRes = await getUserShops(user.email)

        if (!shopRes.success || shopRes.shops.length === 0) {
          // ถ้ายังไม่มีร้าน ให้เด้งกลับไปหน้าแรก
          router.push('/')
          return
        }

        // 🌟 5. ได้รหัสร้านของจริงมาแล้ว! (ใช้ร้านแรกที่ดึงมาได้)
        const realShopId = shopRes.shops[0].id
        setShopId(realShopId)

        // 🌟 6. นำ shopId ของจริงไปเช็คสถานะแพ็กเกจต่อ
        const res = await checkAndEnforceShopStatus(realShopId)
        
        if (res.status === "EXPIRED" || res.status === "PENDING_DELETION") {
          router.push(`/paywall?daysLeft=${res.daysLeftToPurge || 0}`)
        } else {
          setIsChecking(false)
          if (res.expiresAt) {
            setExpiresAt(res.expiresAt)
          }
        }
      } catch (error) {
        console.error("Error checking shop status:", error)
        router.push('/login') // ถ้ามี Error ใดๆ ให้เตะไปหน้า Login ก่อนปลอดภัยสุด
      }
    }
    
    verifyAccess()
  }, [router])

  // 🌟 7. เช็คว่าถ้ากำลังโหลด หรือยังไม่ได้ shopId ให้โชว์หน้า Loader หมุนๆ
  if (isChecking || !shopId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลร้านค้าของท่าน...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      {/* 🌟 8. ส่ง shopId ของจริงเข้าไปทำงาน */}
      <JobSyncManager shopId={shopId} />
      <div className="min-h-screen flex flex-col w-full bg-slate-50/30">

        <DashboardHeader currentTabName={tabNames[activeTab]} />

        {expiresAt && (
          <div className="px-4 md:px-6 pt-4 pb-0">
            <SubscriptionBanner trialEndsAt={expiresAt} />
          </div>
        )}

        <main className="p-4 md:p-6 space-y-4 flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

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