import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueueBoard } from "@/components/queue-board"
import { DashboardOverview } from "@/components/dashboard-overview"
// ... (import icon ที่ต้องใช้)

export default function MainPage() {
  return (
    <div className="p-6 space-y-4">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">📊 ภาพรวม</TabsTrigger>
          <TabsTrigger value="queue">📋 กระดานคิว</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <DashboardOverview />
        </TabsContent>
        
        <TabsContent value="queue">
          <QueueBoard />
        </TabsContent>
      </Tabs>
    </div>
  )
}