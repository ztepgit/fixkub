import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueueBoard } from "@/components/queue-board"
import { DashboardOverview } from "@/components/dashboard-overview"
import { ReportDashboard } from "@/components/report-dashboard"
import { ShopSettings } from "@/components/shop-settings"
import { SidebarProvider } from "@/components/ui/sidebar"

// 🌟 1. Import Icons จาก lucide-react เพื่อความสวยงามแบบมืออาชีพ
import { LayoutDashboard, ClipboardList, BarChart3, Settings } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-header"

export default function MainPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-slate-50/30">

        {/* วาง Header ไว้บนสุดของเพจ (ปุ่มแชร์ QR Code จะอยู่ตรงนี้) */}
        <DashboardHeader />

        {/* พื้นที่เนื้อหาหลักด้านล่าง */}
        <main className="p-4 md:p-6 space-y-4 flex-1">
          <Tabs defaultValue="dashboard" className="w-full">

            {/* 🌟 2. อัปเดต TabsTrigger เปลี่ยนจาก Emoji เป็น Lucide Icons */}
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