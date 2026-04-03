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

import { supabase } from "@/lib/supabase"
import { getUserShops } from "@/actions/shop"
import { useShopStore } from "@/store/useShopStore"

function JobSyncManager({ shopId }: { shopId: string }) {
  useJobSync(shopId)
  return null
}

export default function MainPage() {
  const router = useRouter()

  const [shopId, setShopId] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [expiresAt, setExpiresAt] = useState<Date | string | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  const shop = useShopStore((s) => s.shop)
  const setShop = useShopStore((s) => s.setShop)

  const tabNames: Record<string, string> = {
    dashboard: "ภาพรวม",
    queue: "กระดานคิว",
    report: "รายงานสถิติ",
    settings: "ตั้งค่าร้านค้า",
  }

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
          router.push('/login')
          return
        }

        const shopRes = await getUserShops(user.email)

        if (!shopRes.success || shopRes.shops.length === 0) {
          router.push('/')
          return
        }

        // 🌟 [จุดที่แก้ไข] เช็คว่ามีร้านที่เลือกมาจากหน้า Landing หรือไม่
        let currentShop = shop;
        const isShopSelectedValid = currentShop && shopRes.shops.some(s => s.id === currentShop!.id);

        if (!isShopSelectedValid) {
          // ถ้าไม่มี หรือเลือกร้านผิด ให้ดึงร้านแรกสุด (Index 0)
          currentShop = shopRes.shops[0]
          setShop(currentShop) // ทับค่าลง Zustand
        }

        const realShopId = currentShop!.id
        setShopId(realShopId)

        // 🌟 เรียกใช้ฟังก์ชันเช็คสถานะร้าน (Real-time)
        const res = await checkAndEnforceShopStatus(realShopId)

        // 🌟 เก็บค่าวันหมดอายุไว้เสมอ
        if (res.expiresAt) {
          setExpiresAt(res.expiresAt)
        }

        // 🌟 ตรวจสอบแบบเด็ดขาด: ถ้าสถานะที่ได้กลับมาคือหมดอายุ ให้เด้ง Paywall ทันที!
        if (
          res.status === "EXPIRED" ||
          res.status === "PENDING_DELETION" ||
          res.status === "ERROR"
        ) {
          router.push(`/paywall?daysLeft=${res.daysLeftToPurge || 0}`)
          return
        }

        // ถ้าร้านยังเป็น ACTIVE ให้ปิดหน้าโหลด และเข้าสู่ Dashboard ปกติ
        setIsChecking(false)

      } catch (error) {
        console.error("Error checking shop status:", error)
        router.push('/login')
      }
    }

    verifyAccess()
    // ไม่ใส่ shop ลงใน dependency array เพื่อป้องกันการ re-render ซ้ำซ้อนตอน setShop
  }, [router, setShop]) 

  if (isChecking || !shopId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-10 w-10 text-emerald-600 dark:text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">กำลังโหลดข้อมูลร้านค้าของท่าน...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <JobSyncManager shopId={shopId} />

      <div className="min-h-screen flex flex-col w-full bg-slate-50/30 dark:bg-slate-950">

        <DashboardHeader currentTabName={tabNames[activeTab]} />

        {expiresAt && (
          <div className="px-4 md:px-6 pt-4 pb-0">
            <SubscriptionBanner
              trialEndsAt={expiresAt}
              isDemo={shop?.isDemo ?? false}
            />
          </div>
        )}

        <main className="p-4 md:p-6 space-y-4 flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            <TabsList className="mb-4 bg-slate-100/50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex-wrap h-auto p-1">

              <TabsTrigger
                value="dashboard"
                className="flex-1 md:flex-none flex items-center gap-2 dark:data-[state=active]:bg-slate-800 dark:text-slate-400 dark:data-[state=active]:text-slate-100"
              >
                <LayoutDashboard className="w-4 h-4" /> ภาพรวม
              </TabsTrigger>

              <TabsTrigger
                value="queue"
                className="flex-1 md:flex-none flex items-center gap-2 dark:data-[state=active]:bg-slate-800 dark:text-slate-400 dark:data-[state=active]:text-slate-100"
              >
                <ClipboardList className="w-4 h-4" /> กระดานคิว
              </TabsTrigger>

              <TabsTrigger
                value="report"
                className="flex-1 md:flex-none flex items-center gap-2 dark:data-[state=active]:bg-slate-800 dark:text-slate-400 dark:data-[state=active]:text-slate-100"
              >
                <BarChart3 className="w-4 h-4" /> รายงานสถิติ
              </TabsTrigger>

              <TabsTrigger
                value="settings"
                className="flex-1 md:flex-none flex items-center gap-2 dark:data-[state=active]:bg-slate-800 dark:text-slate-400 dark:data-[state=active]:text-slate-100"
              >
                <Settings className="w-4 h-4" /> ตั้งค่าร้านค้า
              </TabsTrigger>

            </TabsList>

            <TabsContent value="dashboard">
              <DashboardOverview />
            </TabsContent>

            <TabsContent value="queue">
              <QueueBoard />
            </TabsContent>

            <TabsContent value="report">
              <ReportDashboard />
            </TabsContent>

            <TabsContent value="settings">
              <ShopSettings />
            </TabsContent>

          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  )
}