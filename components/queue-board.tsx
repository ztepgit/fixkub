"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Smartphone, 
  Wrench, 
  Clock, 
  Plus, 
  PackageCheck,
  MoreHorizontal,
  ClipboardList
} from "lucide-react"

// ประเภทข้อมูลใบสั่งซ่อม
type RepairJob = {
  id: string
  jobRef: string
  customerName: string
  deviceModel: string
  deviceColor: string
  issue: string
  serviceName: string
  status: "PENDING" | "WAITING" | "PROCESSING" | "REPAIRED"
  timeElapsed?: string
}

// ข้อมูลจำลอง (Mock Data)
const INITIAL_JOBS: RepairJob[] = [
  { id: "1", jobRef: "REP-0105", customerName: "คุณต้น", deviceModel: "iPhone 13 Pro", deviceColor: "Blue", issue: "จอแตก ทัชไม่ได้", serviceName: "เปลี่ยนจอ", status: "PENDING" },
  { id: "5", jobRef: "REP-0107", customerName: "สมชาย", deviceModel: "Oppo Reno 8", deviceColor: "Gold", issue: "จอมืด แต่มีเสียง", serviceName: "เปลี่ยนจอ", status: "PENDING" },
  { id: "6", jobRef: "REP-0108", customerName: "เจ๊หน่อย", deviceModel: "iPhone 14", deviceColor: "Purple", issue: "กล้องหลังสั่น", serviceName: "เปลี่ยนกล้อง", status: "PENDING" },
  { id: "7", jobRef: "REP-0109", customerName: "ลุงชัย", deviceModel: "Samsung A54", deviceColor: "Black", issue: "ลำโพงไม่ดัง", serviceName: "ซ่อมลำโพง", status: "PENDING" },
  { id: "2", jobRef: "REP-0106", customerName: "น้องเอ", deviceModel: "Samsung S23", deviceColor: "Black", issue: "ชาร์จแบตไม่เข้า", serviceName: "เปลี่ยนตูดชาร์จ", status: "WAITING", timeElapsed: "15 นาที" },
  { id: "3", jobRef: "REP-0103", customerName: "เฮียหมู", deviceModel: "iPad Air 5", deviceColor: "Pink", issue: "เปิดไม่ติดเลย โดนน้ำ", serviceName: "ซ่อมบอร์ด", status: "PROCESSING", timeElapsed: "2 ชม." },
  { id: "4", jobRef: "REP-0101", customerName: "เจ๊น้ำ", deviceModel: "iPhone 11", deviceColor: "White", issue: "แบตเสื่อม", serviceName: "เปลี่ยนแบต", status: "REPAIRED", timeElapsed: "รอรับ" },
]

// การตั้งค่าคอลัมน์ของกระดาน
const COLUMNS = [
  { id: "PENDING", title: "ลูกค้าแจ้งซ่อม (ใหม่)", color: "border-slate-300 bg-slate-50", icon: <ClipboardList className="h-5 w-5 text-slate-500" />, badgeColor: "bg-slate-500" },
  { id: "WAITING", title: "รอคิวซ่อม", color: "border-orange-200 bg-orange-50", icon: <Clock className="h-5 w-5 text-orange-500" />, badgeColor: "bg-orange-500" },
  { id: "PROCESSING", title: "กำลังแกะซ่อม", color: "border-blue-200 bg-blue-50", icon: <Wrench className="h-5 w-5 text-blue-500" />, badgeColor: "bg-blue-500" },
  { id: "REPAIRED", title: "ซ่อมเสร็จ / รอรับ", color: "border-emerald-200 bg-emerald-50", icon: <PackageCheck className="h-5 w-5 text-emerald-600" />, badgeColor: "bg-emerald-500" },
]

export function QueueBoard() {
  const [jobs, setJobs] = useState<RepairJob[]>(INITIAL_JOBS)

  const moveJob = (jobId: string, currentStatus: string) => {
    const statusFlow: Record<string, RepairJob["status"] | "COMPLETED"> = {
      "PENDING": "WAITING",
      "WAITING": "PROCESSING",
      "PROCESSING": "REPAIRED",
      "REPAIRED": "COMPLETED"
    }
    
    const nextStatus = statusFlow[currentStatus]
    
    if (nextStatus === "COMPLETED") {
      setJobs(jobs.filter(j => j.id !== jobId))
    } else {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: nextStatus as RepairJob["status"] } : j))
    }
  }

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-8rem)]">
      
      {/* ส่วนหัวกระดาน */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">กระดานคิวงานซ่อม</h2>
          <p className="text-sm text-slate-500">อัปเดตสถานะงานซ่อมได้ง่ายๆ</p>
        </div>
        <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> สร้างใบสั่งซ่อม
        </Button>
      </div>

      {/* กระดาน Kanban */}
      <div className="flex-1 overflow-x-hidden md:overflow-x-auto pb-4">
        <div className="flex flex-col md:flex-row gap-4 h-full md:items-start md:justify-center">
          
          {COLUMNS.map((col) => {
            const columnJobs = jobs.filter(j => j.status === col.id)
            
            return (
              // กรอบหลักของแต่ละคอลัมน์ (ความสูงคงที่)
              <div key={col.id} className={`w-full md:w-[320px] md:shrink-0 rounded-xl border-2 flex flex-col h-[450px] md:h-full overflow-hidden ${col.color}`}>
                
                {/* 💎 1. หัวคอลัมน์ (ใส่ shrink-0 ป้องกันไม่ให้หัวตารางโดนบีบแบน) */}
                <div className="p-3 border-b border-black/5 bg-white/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <h3 className="font-bold text-slate-700">{col.title}</h3>
                  </div>
                  <Badge variant="secondary" className="font-bold shadow-sm">
                    {columnJobs.length}
                  </Badge>
                </div>

                {/* 💎 2. พื้นที่รายชื่อการ์ด (เคล็ดลับระดับโลก: flex-1 + min-h-0 + overflow-y-auto) */}
                {/* ถอด ScrollArea ออก แล้วใช้ Native Web Scroll แทน เพื่อการแสดงผลที่แม่นยำ 100% */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  
                  {/* กล่องจัดเรียงการ์ด (ใส่ pb-2 เพื่อให้ล่างสุดมีช่องว่าง ไม่ติดขอบเกินไป) */}
                  <div className="space-y-3 pb-2">
                    {columnJobs.length === 0 ? (
                      <div className="text-center p-4 py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        ไม่มีงานในสถานะนี้
                      </div>
                    ) : (
                      columnJobs.map((job) => (
                        <Card key={job.id} className="shadow-sm border-slate-200 hover:border-emerald-300 transition-colors cursor-default">
                          <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                            <div>
                              <Badge variant="outline" className={`text-white border-transparent ${col.badgeColor} mb-1`}>
                                {job.jobRef}
                              </Badge>
                              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                                <Smartphone className="h-4 w-4 text-emerald-600" />
                                {job.deviceModel}
                              </CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 -mr-2 -mt-2">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                          
                          <CardContent className="p-3 pt-0 text-sm space-y-2">
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="font-medium">{job.customerName}</span>
                              <span className="text-xs">{job.timeElapsed}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs text-slate-600">
                              <span className="font-semibold text-emerald-700">[{job.serviceName}]</span> {job.issue}
                            </div>
                          </CardContent>
                          
                          <CardFooter className="p-3 pt-0 flex gap-2">
                            <Button 
                              onClick={() => moveJob(job.id, job.status)}
                              className="w-full text-xs h-8 bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                            >
                              {job.status === "PENDING" && "รับเครื่องเข้าคิว"}
                              {job.status === "WAITING" && "เริ่มลงมือซ่อม"}
                              {job.status === "PROCESSING" && "ซ่อมเสร็จแล้ว"}
                              {job.status === "REPAIRED" && "ลูกค้ามารับแล้ว (จบงาน)"}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))
                    )}
                  </div>

                </div>
              </div>
            )
          })}
          
        </div>
      </div>
    </div>
  )
}