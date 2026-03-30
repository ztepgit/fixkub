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

  // ✅ Zustand
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

        // ✅ ดึง shop ตัวจริง
        const currentShop = shopRes.shops[0]

        // ✅ ใส่เข้า Zustand (สำคัญสุด)
        setShop(currentShop)

        // 🧪 debug
        console.log("shop loaded:", currentShop)

        const realShopId = currentShop.id
        setShopId(realShopId)

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
        router.push('/login')
      }
    }

    verifyAccess()
  }, [router, setShop])

  // 🧪 debug อีกชั้น
  useEffect(() => {
    console.log("shop from store:", shop)
  }, [shop])

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
      <JobSyncManager shopId={shopId} />

      <div className="min-h-screen flex flex-col w-full bg-slate-50/30">

        <DashboardHeader currentTabName={tabNames[activeTab]} />

        {/* ✅ กัน undefined 100% */}
        {expiresAt && (
          <div className="px-4 md:px-6 pt-4 pb-0">
            <SubscriptionBanner 
              trialEndsAt={expiresAt}
              isDemo={shop?.isDemo ?? false} // 🔥 fix สำคัญ
            />
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