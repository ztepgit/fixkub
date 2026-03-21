"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

import { getQueueByRefOrPhone } from "@/actions/queue"

type QueueData = {
  id: string
  jobRef: string | null
  customerName: string
  deviceModel: string
  serviceName: string | null
  status: string
  cancelReason?: string | null
}

// 🌟 1. เปิดประตูรับ Props shopId ตรงนี้ครับ
export function CustomerQueueStatus({ shopId }: { shopId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [jobData, setJobData] = useState<QueueData | null>(null)
  
  const { toast } = useToast()

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setJobData(null) 

    try {
      // 🌟 2. เปลี่ยนจาก "shop_test_001" เป็น shopId ที่รับมาจาก Props
      const res = await getQueueByRefOrPhone(shopId, searchQuery.trim())
      
      if (res.success && res.data) {
        setJobData(res.data as QueueData)
        toast({
          title: "✅ พบข้อมูลของคุณ",
          description: `กำลังแสดงสถานะล่าสุดของเครื่อง ${res.data.deviceModel}`,
        })
      } else {
        toast({
          title: "❌ ไม่พบข้อมูล",
          description: res.error || "กรุณาตรวจสอบเบอร์โทรศัพท์หรือเลขที่บิลอีกครั้ง",
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
    if (!jobData?.id) return

    const channel = supabase
      .channel(`queue_status_${jobData.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'Queue',
          filter: `id=eq.${jobData.id}` 
        },
        (payload) => {
          console.log('🔄 อัปเดตสถานะล่าสุดจากร้าน!', payload.new)
          setJobData(payload.new as QueueData)
          
          toast({
            title: "🔔 อัปเดตสถานะการซ่อม!",
            description: "ร้านซ่อมได้อัปเดตสถานะเครื่องของคุณแล้ว",
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobData?.id, toast])

  const statusFlow = ["PENDING", "WAITING", "PROCESSING", "REPAIRED", "COMPLETED"]
  const currentStepIndex = jobData ? statusFlow.indexOf(jobData.status) : -1

  return (
    <div className="mx-auto w-full max-w-md space-y-6 pb-6">
      
      <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-1">เช็คสถานะงานซ่อม</h2>
        <p className="text-sm text-slate-500">กรอกเบอร์โทรศัพท์ หรือชื่อ เพื่อติดตามสถานะ</p>
        
        <form onSubmit={handleSearch} className="flex gap-2 mt-4">
          <Input 
            placeholder="เช่น 0812345678 หรือ Q-XXXX" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white h-12"
          />
          <Button type="submit" disabled={isLoading || !searchQuery} className="bg-blue-600 hover:bg-blue-700 h-12 px-6">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </Button>
        </form>
      </div>

      {jobData && (
        <Card className="border-slate-200 shadow-lg mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-slate-800 p-5 text-white">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className="bg-slate-700/50 text-slate-200 border-slate-600">
                {jobData.jobRef || "รอรันเลขบิล"}
              </Badge>
              {jobData.status === "COMPLETED" && (
                <Badge className="bg-emerald-500 hover:bg-emerald-600">ปิดจ๊อบแล้ว</Badge>
              )}
              {jobData.status === "CANCELLED" && (
                <Badge variant="destructive">ยกเลิกแล้ว</Badge>
              )}
            </div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
              <Smartphone className="h-5 w-5 text-blue-400" />
              {jobData.deviceModel}
            </h3>
            <p className="text-slate-400 text-sm">บริการ: {jobData.serviceName || "ตรวจเช็คทั่วไป"}</p>
            <p className="text-slate-400 text-sm">คุณลูกค้า: {jobData.customerName}</p>
          </div>

          {jobData.status !== "CANCELLED" && jobData.status !== "ARCHIVED" && (
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

          {jobData.status === "ARCHIVED" && (
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">เครื่องอยู่ในคลัง</h3>
              <p className="text-sm text-slate-600">
                เครื่องของคุณซ่อมเสร็จเรียบร้อยแล้วและถูกเก็บรักษาไว้ในคลัง<br/>กรุณาติดต่อร้านเพื่อขอรับเครื่องครับ
              </p>
            </CardContent>
          )}

          {jobData.status === "CANCELLED" && (
            <CardContent className="p-6 text-center space-y-3 border-t-4 border-rose-500">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <XCircle className="h-8 w-8 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">รายการนี้ถูกยกเลิกแล้ว</h3>
              <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm inline-block">
                สาเหตุ: {
                  jobData.cancelReason === "NO_SHOW" ? "ไม่นำเครื่องมาส่งตามนัด" :
                  jobData.cancelReason === "UNREPAIRABLE" ? "เครื่องอาการหนัก ไม่สามารถซ่อมได้" :
                  jobData.cancelReason === "NO_PARTS" ? "ไม่มีอะไหล่สำหรับรุ่นนี้" :
                  jobData.cancelReason === "CUSTOMER_CANCEL" ? "ลูกค้ายกเลิกการซ่อม" :
                  jobData.cancelReason === "UNCONTACTABLE" ? "ติดต่อไม่ได้ / ทิ้งเครื่อง" :
                  "ยกเลิกโดยทางร้าน"
                }
              </div>
            </CardContent>
          )}

        </Card>
      )}
    </div>
  )
}