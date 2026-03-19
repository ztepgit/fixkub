import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueueBoard } from "@/components/queue-board"
import { DashboardOverview } from "@/components/dashboard-overview"
// 🌟 1. Import หน้า Report เข้ามา
import { ReportDashboard } from "@/components/report-dashboard" 

export default function MainPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs defaultValue="dashboard" className="w-full">
        {/* 🌟 2. เพิ่ม TabsTrigger สำหรับหน้าสถิติ */}
        <TabsList className="mb-4 bg-slate-100/50 border border-slate-200">
          <TabsTrigger value="dashboard">📊 ภาพรวม</TabsTrigger>
          <TabsTrigger value="queue">📋 กระดานคิว</TabsTrigger>
          <TabsTrigger value="report">📈 รายงานสถิติ</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <DashboardOverview />
        </TabsContent>
        
        <TabsContent value="queue" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <QueueBoard />
        </TabsContent>

        {/* 🌟 3. เพิ่ม TabsContent เพื่อเรนเดอร์หน้า Report */}
        <TabsContent value="report" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <ReportDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}