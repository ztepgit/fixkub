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
import { SubscriptionBanner } from "@/components/subscription-banner" // 🌟 Import Banner
import { checkAndEnforceShopStatus } from "@/actions/shop-status"

function JobSyncManager({ shopId }: { shopId: string }) {
  useJobSync(shopId)
  return null
}

export default function MainPage() {
  const router = useRouter()
  const SHOP_ID = "shop_test_001" 

  const [isChecking, setIsChecking] = useState(true)
  // 🌟 1. เพิ่ม State เก็บวันหมดอายุ
  const [expiresAt, setExpiresAt] = useState<Date | string | null>(null)

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const res = await checkAndEnforceShopStatus(SHOP_ID)
        
        if (res.status === "EXPIRED" || res.status === "PENDING_DELETION") {
          router.push(`/paywall?daysLeft=${res.daysLeftToPurge || 0}`)
        } else {
          setIsChecking(false)
          // 🌟 2. ถ้าเข้าใช้งานได้ ให้นำวันหมดอายุมาเก็บไว้ใน State
          if (res.expiresAt) {
            setExpiresAt(res.expiresAt)
          }
        }
      } catch (error) {
        console.error("Error checking shop status:", error)
        setIsChecking(false) 
      }
    }
    
    verifyAccess()
  }, [router, SHOP_ID])

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

        <DashboardHeader />

        {/* 🌟 3. วาง Banner แจ้งเตือน (โชว์เฉพาะร้านที่มีวันหมดอายุ และเหลือน้อยกว่า 7 วัน) */}
        {expiresAt && (
          <div className="px-4 md:px-6 pt-4 pb-0">
            <SubscriptionBanner trialEndsAt={expiresAt} />
          </div>
        )}

        <main className="p-4 md:p-6 space-y-4 flex-1">
          <Tabs defaultValue="dashboard" className="w-full">

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