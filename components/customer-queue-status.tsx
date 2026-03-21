"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { 
  Search, 
  Loader2, 
  Smartphone, 
  Wrench, 
  PackageCheck, 
  AlertCircle, 
  XCircle,
  ClipboardList
} from "lucide-react"

import { getCustomerQueues } from "@/actions/queue"

type QueueData = {
  id: string
  jobRef: string | null
  customerName: string
  deviceModel: string
  deviceColor: string | null // 🌟 1. เพิ่มฟิลด์สีตรงนี้
  serviceName: string | null
  status: string
  cancelReason?: string | null
}

export function CustomerQueueStatus({ shopId }: { shopId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [jobList, setJobList] = useState<QueueData[] | null>(null) 
  
  const { toast } = useToast()

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setJobList(null) 

    try {
      const res = await getCustomerQueues(shopId, searchQuery.trim())
      
      if (res.success && res.data && res.data.length > 0) {
        setJobList(res.data as QueueData[])
        toast({
          title: "✅ พบข้อมูลของคุณ",
          description: `พบประวัติงานซ่อมทั้งหมด ${res.data.length} รายการ`,
        })
      } else {
        setJobList([])
        toast({
          title: "❌ ไม่พบข้อมูล",
          description: "ไม่พบประวัติงานซ่อมจากชื่อหรือเบอร์โทรนี้",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!jobList || jobList.length === 0) return

    const jobIds = jobList.map(job => job.id)

    const channel = supabase
      .channel('queue_status_multiple')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'Queue'
        },
        (payload) => {
          const updatedJob = payload.new as QueueData
          if (jobIds.includes(updatedJob.id)) {
            console.log('🔄 สถานะเปลี่ยน!', updatedJob)
            
            setJobList(prev => 
              prev ? prev.map(job => job.id === updatedJob.id ? updatedJob : job) : prev
            )
            
            toast({
              title: "🔔 สถานะอัปเดต!",
              description: `เครื่อง ${updatedJob.deviceModel} มีการเปลี่ยนสถานะ`,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobList?.map(j => j.id).join(','), toast])

  const statusFlow = ["PENDING", "WAITING", "PROCESSING", "REPAIRED", "COMPLETED"]

  return (
    <div className="mx-auto w-full max-w-md space-y-0 pb-6 flex flex-col h-full max-h-[85vh]">
      
      <div className="bg-slate-50 border-b border-slate-100 p-6 text-center shrink-0">
        <h2 className="text-xl font-bold text-slate-800 mb-1">เช็คสถานะงานซ่อม</h2>
        <p className="text-sm text-slate-500">กรอกเบอร์โทรศัพท์ หรือ ชื่อ เพื่อติดตามสถานะ</p>
        
        <form onSubmit={handleSearch} className="flex gap-2 mt-4">
          <Input 
            placeholder="เช่น 0812345678, Q-XXXX หรือ ชื่อ" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white h-12"
          />
          <Button type="submit" disabled={isLoading || !searchQuery} className="bg-blue-600 hover:bg-blue-700 h-12 px-6">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-12 space-y-6">
        
        {jobList?.length === 0 && (
           <div className="text-center text-slate-400 mt-10">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>ไม่พบรายการซ่อมของคุณ</p>
           </div>
        )}

        {jobList && jobList.map((job) => {
          const currentStepIndex = statusFlow.indexOf(job.status)
          
          return (
            <Card key={job.id} className="border-slate-200 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="bg-slate-800 p-5 text-white">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-slate-700/50 text-slate-200 border-slate-600">
                    {job.jobRef || "รอรันเลขบิล"}
                  </Badge>
                  {job.status === "COMPLETED" && (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">ปิดจ๊อบแล้ว</Badge>
                  )}
                  {job.status === "CANCELLED" && (
                    <Badge variant="destructive">ยกเลิกแล้ว</Badge>
                  )}
                </div>
                
                {/* 🌟 2. เพิ่มการแสดงผลสีตัวเครื่องตรงนี้ครับ */}
                <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
                  <Smartphone className="h-5 w-5 text-blue-400 shrink-0" />
                  <span className="truncate">
                    {job.deviceModel}
                    {job.deviceColor && (
                      <span className="text-blue-200 font-normal text-base ml-1.5">
                        (สี{job.deviceColor.replace(/^สี/, '')})
                      </span>
                    )}
                  </span>
                </h3>
                
                <p className="text-slate-400 text-sm">บริการ: {job.serviceName || "ตรวจเช็คทั่วไป"}</p>
                <p className="text-slate-400 text-sm truncate">ลูกค้า: {job.customerName}</p>
              </div>

              {job.status !== "CANCELLED" && job.status !== "ARCHIVED" && (
                <CardContent className="p-6">
                  <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
                    
                    <div className="relative pl-6">
                      <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center ${currentStepIndex >= 0 ? "bg-slate-500" : "bg-slate-200"}`}>
                        <ClipboardList className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <h4 className={`font-bold ${currentStepIndex >= 0 ? "text-slate-800" : "text-slate-400"}`}>1. รับเรื่อง / รอคิวซ่อม</h4>
                        <p className="text-xs text-slate-500 mt-1">ทางร้านรับเครื่องเข้าระบบแล้ว</p>
                      </div>
                    </div>

                    <div className="relative pl-6">
                      <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center ${currentStepIndex >= 2 ? "bg-blue-500" : "bg-slate-200"}`}>
                        {currentStepIndex === 2 && <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50 animate-ping"></span>}
                        <Wrench className="h-3.5 w-3.5 text-white relative z-10" />
                      </div>
                      <div>
                        <h4 className={`font-bold ${currentStepIndex >= 2 ? "text-blue-700" : "text-slate-400"}`}>2. ช่างกำลังดำเนินการซ่อม</h4>
                        <p className="text-xs text-slate-500 mt-1">กำลังแกะเครื่องและเปลี่ยนอะไหล่</p>
                      </div>
                    </div>

                    <div className="relative pl-6">
                      <div className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-white flex items-center justify-center ${currentStepIndex >= 3 ? "bg-emerald-500" : "bg-slate-200"}`}>
                        {currentStepIndex === 3 && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50 animate-ping"></span>}
                        <PackageCheck className="h-3.5 w-3.5 text-white relative z-10" />
                      </div>
                      <div>
                        <h4 className={`font-bold ${currentStepIndex >= 3 ? "text-emerald-600" : "text-slate-400"}`}>3. ซ่อมเสร็จเรียบร้อย!</h4>
                        <p className="text-xs text-slate-500 mt-1">เครื่องพร้อมใช้งาน มารับได้เลยครับ</p>
                      </div>
                    </div>

                  </div>
                </CardContent>
              )}

              {job.status === "ARCHIVED" && (
                <CardContent className="p-6 text-center space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <AlertCircle className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">เครื่องอยู่ในคลัง</h3>
                  <p className="text-sm text-slate-600">
                    เครื่องซ่อมเสร็จและถูกเก็บรักษาไว้<br/>กรุณาติดต่อร้านเพื่อขอรับเครื่อง
                  </p>
                </CardContent>
              )}

              {job.status === "CANCELLED" && (
                <CardContent className="p-6 text-center space-y-3 border-t-4 border-rose-500">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                    <XCircle className="h-8 w-8 text-rose-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">รายการถูกยกเลิก</h3>
                  <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm inline-block">
                    สาเหตุ: {
                      job.cancelReason === "NO_SHOW" ? "ไม่นำเครื่องมาส่งตามนัด" :
                      job.cancelReason === "UNREPAIRABLE" ? "ซ่อมไม่ได้/บอร์ดเสีย" :
                      job.cancelReason === "NO_PARTS" ? "ไม่มีอะไหล่" :
                      job.cancelReason === "CUSTOMER_CANCEL" ? "ลูกค้ายกเลิก" :
                      job.cancelReason === "UNCONTACTABLE" ? "ติดต่อไม่ได้" :
                      "ยกเลิกโดยร้าน"
                    }
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}