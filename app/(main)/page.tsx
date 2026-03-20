import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueueBoard } from "@/components/queue-board"
import { DashboardOverview } from "@/components/dashboard-overview"
import { ReportDashboard } from "@/components/report-dashboard"
// 🌟 1. Import หน้า ShopSettings เข้ามา
import { ShopSettings } from "@/components/shop-settings"

export default function MainPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs defaultValue="dashboard" className="w-full">
        
        {/* 🌟 2. เพิ่มปุ่มกดแท็บ "ตั้งค่าร้านค้า" */}
        <TabsList className="mb-4 bg-slate-100/50 border border-slate-200 flex-wrap h-auto p-1">
          <TabsTrigger value="dashboard" className="flex-1 md:flex-none">📊 ภาพรวม</TabsTrigger>
          <TabsTrigger value="queue" className="flex-1 md:flex-none">📋 กระดานคิว</TabsTrigger>
          <TabsTrigger value="report" className="flex-1 md:flex-none">📈 รายงานสถิติ</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 md:flex-none">⚙️ ตั้งค่าร้านค้า</TabsTrigger>
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

        {/* 🌟 3. เพิ่มเนื้อหาของแท็บตั้งค่า */}
        <TabsContent value="settings" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <ShopSettings />
        </TabsContent>
        
      </Tabs>
    </div>
  )
}