"use client"

import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query" // 🌟 1. Import useMutation จาก React Query
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Smartphone, Wrench, Clock, Plus, PackageCheck, MoreHorizontal, ClipboardList,
  XCircle, Trash2, RotateCcw, AlertCircle, Archive, Banknote, Barcode, Hash,
  Loader2, CheckCircle2, UserX, Phone, Search
} from "lucide-react"
import { ShopOwnerCreateQueue } from "@/components/shop-owner-create-queue"
import { updateQueueStatus } from "@/actions/queue"

import { useJobStore } from "@/store/useJobStore"

type CancelReason = "NO_SHOW" | "CUSTOMER_CANCEL" | "UNREPAIRABLE" | "NO_PARTS" | "UNCONTACTABLE"

type RepairJob = {
  id: string
  jobRef: string
  customerName: string
  phone?: string
  deviceModel: string
  deviceColor?: string
  issue?: string
  serviceName?: string
  status: "PENDING" | "WAITING" | "PROCESSING" | "REPAIRED" | "CANCELLED" | "COMPLETED" | "ARCHIVED"
  timeElapsed?: string
  cancelReason?: CancelReason
  cancelledAt?: Date | string
  estimatedPrice?: string
  serialNumber?: string
  imei?: string
  phoneNumber?: string
  createdAt?: Date | string
}

const COLUMNS = [
  { id: "PENDING", title: "ลูกค้าแจ้งซ่อม", color: "border-slate-300 bg-slate-50", icon: ClipboardList, iconColor: "text-slate-500", badgeColor: "bg-slate-500" },
  { id: "WAITING", title: "รอคิวซ่อม", color: "border-orange-200 bg-orange-50", icon: Clock, iconColor: "text-orange-500", badgeColor: "bg-orange-500" },
  { id: "PROCESSING", title: "กำลังแกะซ่อม", color: "border-blue-200 bg-blue-50", icon: Wrench, iconColor: "text-blue-500", badgeColor: "bg-blue-500" },
  { id: "REPAIRED", title: "ซ่อมเสร็จ / รอรับ", color: "border-emerald-200 bg-emerald-50", icon: PackageCheck, iconColor: "text-emerald-600", badgeColor: "bg-emerald-500" },
]

const formatPhoneNumber = (phone?: string) => {
  if (!phone) return ""
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  if (cleaned.length === 9) return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`
  return phone
}

const formatShortDate = (date?: Date | string) => {
  if (!date) return ""
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

const formatFullDateTime = (date?: Date | string) => {
  if (!date) return ""
  return new Date(date).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' น.'
}

export function QueueBoard() {
  const { toast } = useToast()

  const allJobs = useJobStore((state) => state.jobs)
  const upsertJob = useJobStore((state) => state.upsertJob)
  const removeJob = useJobStore((state) => state.removeJob)
  const lastSyncAt = useJobStore((state) => state.lastSyncAt)

  const activeJobs = allJobs.filter(j => !["CANCELLED", "COMPLETED", "ARCHIVED"].includes(j.status)) as RepairJob[]
  const trashedJobs = allJobs.filter(j => j.status === "CANCELLED") as RepairJob[]
  const archivedJobs = allJobs.filter(j => j.status === "ARCHIVED") as RepairJob[]

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [jobToCancel, setJobToCancel] = useState<RepairJob | null>(null)
  const [cancelReason, setCancelReason] = useState<CancelReason | "">("")
  const [jobToDelete, setJobToDelete] = useState<RepairJob | null>(null)
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false)
  const [jobToView, setJobToView] = useState<RepairJob | null>(null)
  
  const [editPrice, setEditPrice] = useState("")
  const [editSn, setEditSn] = useState("")
  const [editImei, setEditImei] = useState("")
  
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("")
  const [trashSearchQuery, setTrashSearchQuery] = useState("")

  useEffect(() => {
    if (jobToView) {
      setEditPrice(jobToView.estimatedPrice?.toString() || "")
      setEditSn(jobToView.serialNumber || "")
      setEditImei(jobToView.imei || "")
    }
  }, [jobToView])

  // 🌟 2. สร้าง Mutation กลาง สำหรับใช้กับทุก Action
  const updateJobMutation = useMutation({
    mutationFn: async (vars: { id: string, status: string, data?: any }) => {
      const res = await updateQueueStatus(vars.id, vars.status, vars.data)
      if (!res.success) throw new Error(res.error || "Update failed")
      return res.data
    },
    onError: (err, variables, context) => {
      console.error("Mutation Error:", err)
      toast({ 
        title: "❌ เกิดข้อผิดพลาด", 
        description: "บันทึกข้อมูลไม่สำเร็จ ระบบจะพยายามซิงค์ใหม่", 
        variant: "destructive" 
      })
      // หมายเหตุ: ตรงนี้เราสามารถเขียน Logic ย้อนกลับ State (Rollback) ใน Zustand ได้ 
      // แต่ในแอปประเภทนี้ การปล่อยให้ hook realtime ดึงข้อมูลทับรอบถัดไปก็ปลอดภัยพอครับ
    }
  })

  // 🌟 ฟังก์ชันต่างๆ ถูกปรับให้เรียกผ่าน Mutation แทน (Optimistic Update ที่ Zustand ทำงานไปก่อนแล้ว)
  const moveJob = (jobId: string, currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      "PENDING": "WAITING",
      "WAITING": "PROCESSING",
      "PROCESSING": "REPAIRED",
      "REPAIRED": "COMPLETED"
    }
    const nextStatus = statusFlow[currentStatus]
    const job = allJobs.find(j => j.id === jobId)
    if (!job || !nextStatus) return

    const optimisticJob = { ...job, status: nextStatus as any, updatedAt: new Date().toISOString() }
    const updateData = nextStatus === "COMPLETED" ? { completedAt: new Date() } : undefined
    
    if (nextStatus === "COMPLETED") {
      optimisticJob.completedAt = new Date().toISOString()
      toast({ title: "✅ ปิดจ๊อบสำเร็จ", description: "ลูกค้ามารับเครื่องเรียบร้อยแล้ว" })
    }

    // 1. อัปเดต UI ทันที
    upsertJob(optimisticJob)
    // 2. โยนงานให้ React Query ไปสู้กับ Backend
    updateJobMutation.mutate({ id: jobId, status: nextStatus, data: updateData })
  }

  const handleSaveDetails = () => {
    if (!jobToView) return
    
    const updatedData = {
      estimatedPrice: editPrice ? parseFloat(editPrice) : null,
      serialNumber: editSn,
      imei: editImei
    }

    upsertJob({ ...jobToView, ...updatedData, updatedAt: new Date().toISOString() })
    toast({ title: "💾 บันทึกข้อมูลสำเร็จ", description: `อัปเดตรายละเอียดคิวเรียบร้อยแล้ว` })
    setJobToView(null)

    updateJobMutation.mutate({ id: jobToView.id, status: jobToView.status, data: updatedData })
  }

  const confirmCancelJob = () => {
    if (!jobToCancel || !cancelReason) return

    const updateData = {
      cancelReason: cancelReason as CancelReason,
      cancelledAt: new Date().toISOString()
    }

    upsertJob({ ...jobToCancel, status: "CANCELLED", ...updateData, updatedAt: new Date().toISOString() })
    setJobToCancel(null)
    setCancelReason("")
    toast({ title: "🗑️ ยกเลิกงานเรียบร้อย", description: `ย้ายคิวไปที่ถังขยะแล้ว`, duration: 3000 })

    updateJobMutation.mutate({ 
      id: jobToCancel.id, 
      status: "CANCELLED", 
      data: { cancelReason, cancelledAt: new Date() } 
    })
  }

  const restoreJob = (jobId: string) => {
    const jobToRestore = trashedJobs.find(j => j.id === jobId)
    if (!jobToRestore) return

    const isUncontactable = jobToRestore.cancelReason === "UNCONTACTABLE"
    const targetStatus = isUncontactable ? "ARCHIVED" : "PENDING"

    upsertJob({
      ...jobToRestore,
      status: targetStatus as any,
      cancelReason: undefined,
      cancelledAt: undefined,
      updatedAt: new Date().toISOString()
    })

    toast({
      title: "🔄 คืนค่างานสำเร็จ",
      description: isUncontactable ? "ถูกดึงกลับเข้าคลังแล้ว" : "กลับสู่กระดานคิวแล้ว",
      duration: 3000,
    })

    updateJobMutation.mutate({ id: jobId, status: targetStatus, data: { cancelReason: null, cancelledAt: null } })
  }

  const confirmDeletePermanently = () => {
    if (!jobToDelete) return
    removeJob(jobToDelete.id)
    toast({ variant: "destructive", title: "🗑️ ลบข้อมูลถาวรแล้ว", description: `คิวถูกลบออกจากระบบอย่างถาวร` })
    setJobToDelete(null)
    // *หากมี API ลบถาวร ค่อยเพิ่ม Mutation สำหรับการลบตรงนี้ครับ
  }

  const confirmEmptyTrash = () => {
    trashedJobs.forEach(job => removeJob(job.id))
    toast({ variant: "destructive", title: "💥 เทถังขยะเรียบร้อยแล้ว", description: "งานที่ถูกยกเลิกทั้งหมดถูกลบถาวรแล้ว" })
    setIsConfirmEmptyOpen(false)
  }

  const handleMoveToArchive = (jobId: string, jobRef: string) => {
    const job = allJobs.find(j => j.id === jobId)
    if (job) {
      upsertJob({ ...job, status: "ARCHIVED", updatedAt: new Date().toISOString() })
      toast({ title: "📦 ย้ายเครื่องเข้าคลัง", description: `รายการถูกย้ายไปยังคลังเครื่องค้างแล้ว`, duration: 3000 })
      updateJobMutation.mutate({ id: jobId, status: "ARCHIVED" })
    }
  }

  const unarchiveJob = (jobId: string) => {
    const jobToUnarchive = archivedJobs.find(j => j.id === jobId)
    if (jobToUnarchive) {
      upsertJob({ ...jobToUnarchive, status: "REPAIRED", updatedAt: new Date().toISOString() })
      toast({ title: "🔄 ดึงกลับหน้ากระดาน", description: `รายการถูกดึงกลับมาที่ช่องรอรับแล้ว` })
      updateJobMutation.mutate({ id: jobId, status: "REPAIRED" })
    }
  }

  const completeArchivedJob = (jobId: string) => {
    const job = archivedJobs.find(j => j.id === jobId)
    if (job) {
      upsertJob({ ...job, status: "COMPLETED", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      toast({ title: "✅ ปิดจ๊อบสำเร็จ", description: "ลูกค้ามารับเครื่องจากคลังเรียบร้อยแล้ว" })
      updateJobMutation.mutate({ id: jobId, status: "COMPLETED", data: { completedAt: new Date() } })
    }
  }

  const markAsUncontactable = (jobId: string, jobRef: string) => {
    const job = archivedJobs.find(j => j.id === jobId)
    if (job) {
      const updateData = { cancelReason: "UNCONTACTABLE" as CancelReason, cancelledAt: new Date().toISOString() }
      upsertJob({ ...job, status: "CANCELLED", ...updateData, updatedAt: new Date().toISOString() })
      toast({ title: "❌ ส่งไปถังขยะ", description: `รายการถูกบันทึกว่าติดต่อไม่ได้` })
      updateJobMutation.mutate({ id: jobId, status: "CANCELLED", data: { cancelReason: "UNCONTACTABLE", cancelledAt: new Date() } })
    }
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case "PENDING": return "รอยืนยัน"
      case "WAITING": return "รอคิวซ่อม"
      case "PROCESSING": return "กำลังซ่อม"
      case "REPAIRED": return "ซ่อมเสร็จแล้ว"
      default: return status
    }
  }

  const filteredArchivedJobs = archivedJobs.filter(job => {
    if (!archiveSearchQuery) return true;
    const searchLower = archiveSearchQuery.toLowerCase();
    return (job.phoneNumber || job.phone || "").includes(searchLower) ||
           (job.customerName || "").toLowerCase().includes(searchLower) ||
           (job.deviceModel || "").toLowerCase().includes(searchLower) || 
           (job.jobRef || "").toLowerCase().includes(searchLower);
  });

  const filteredTrashedJobs = trashedJobs.filter(job => {
    if (!trashSearchQuery) return true;
    const searchLower = trashSearchQuery.toLowerCase();
    return (job.phoneNumber || job.phone || "").includes(searchLower) ||
           (job.customerName || "").toLowerCase().includes(searchLower) ||
           (job.deviceModel || "").toLowerCase().includes(searchLower) || 
           (job.jobRef || "").toLowerCase().includes(searchLower);
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-8rem)]">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">กระดานคิวงานซ่อม</h2>
            <p className="text-sm text-slate-500">อัปเดตสถานะงานซ่อมได้ง่ายๆ (Hybrid Sync)</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none text-slate-600 border-slate-300">
                  <Archive className="mr-2 h-4 w-4 text-amber-500" /> คลังดอง
                  {archivedJobs.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200">
                      {archivedJobs.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-slate-50">
                <SheetHeader className="shrink-0 px-2">
                  <SheetTitle className="flex items-center gap-2 text-amber-600">
                    <Archive className="h-5 w-5" /> คลังดอง
                  </SheetTitle>
                  <SheetDescription>
                    งานที่ซ่อมเสร็จแล้ว แต่ลูกค้ายังไม่มารับ
                  </SheetDescription>
                </SheetHeader>

                <div className="relative mt-4 shrink-0 mx-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ค้นหาเบอร์โทร, ชื่อ, รุ่นเครื่อง, หรือรหัสคิว..."
                    className="pl-9 h-9 text-sm border-amber-200 focus-visible:ring-amber-500"
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto mt-4 space-y-3 px-2 pb-6">
                  {filteredArchivedJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                      <Search className="h-10 w-10 opacity-20" />
                      <p className="text-sm">{archiveSearchQuery ? "ไม่พบข้อมูลที่ค้นหา" : "ไม่มีรายการ"}</p>
                    </div>
                  ) : (
                    filteredArchivedJobs.map(job => (
                      <Card key={job.id} className="shadow-sm border-amber-200 bg-white">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 mb-1">
                                {job.jobRef}
                              </Badge>
                              <CardTitle className="text-sm font-bold">
                                {job.deviceModel} {job.deviceColor && <span className="text-xs font-normal text-slate-500">(สี{job.deviceColor})</span>}
                              </CardTitle>
                            </div>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[10px] text-slate-400 cursor-help whitespace-nowrap mt-1">
                                  {formatShortDate(job.createdAt)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatFullDateTime(job.createdAt)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs text-slate-600 space-y-1">
                          <p><span className="font-semibold">ลูกค้า:</span> {job.customerName} {(job.phoneNumber || job.phone) && <span className="text-slate-500">({formatPhoneNumber(job.phoneNumber || job.phone)})</span>}</p>
                          <p><span className="font-semibold">บริการ:</span> {job.serviceName || "ทั่วไป"}</p>
                          
                          {job.estimatedPrice && (
                            <p><span className="font-semibold">ประเมิน:</span> <span className="text-blue-600 font-medium">฿{job.estimatedPrice}</span></p>
                          )}
                          
                          {(job.serialNumber || job.imei) && (
                            <div className="pt-1.5 mt-1 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                              {job.serialNumber && <p className="flex items-center gap-1"><span className="font-semibold">S/N:</span> {job.serialNumber}</p>}
                              {job.imei && <p className="flex items-center gap-1"><span className="font-semibold">IMEI:</span> {job.imei}</p>}
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="p-3 pt-0 flex flex-col gap-2 border-t border-slate-50 mt-2">
                          <Button
                            className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => completeArchivedJob(job.id)}
                            disabled={updateJobMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" /> ลูกค้ามารับเครื่อง (ปิดจ๊อบ)
                          </Button>
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => unarchiveJob(job.id)}
                              disabled={updateJobMutation.isPending}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" /> ดึงกลับ
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => markAsUncontactable(job.id, job.jobRef)}
                              disabled={updateJobMutation.isPending}
                            >
                              <UserX className="h-3 w-3 mr-1" /> ติดต่อไม่ได้
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none text-slate-600 border-slate-300">
                  <Trash2 className="mr-2 h-4 w-4 text-rose-500" /> ถังขยะ
                  {trashedJobs.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {trashedJobs.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-slate-50">
                <SheetHeader className="shrink-0 px-2">
                  <SheetTitle className="flex items-center gap-2 text-rose-600">
                    <Trash2 className="h-5 w-5" /> ถังขยะ (งานที่ถูกยกเลิก)
                  </SheetTitle>
                  <SheetDescription>
                    งานในถังขยะจะถูกลบถาวรอัตโนมัติเมื่อครบ 30 วัน
                  </SheetDescription>
                </SheetHeader>

                <div className="relative mt-4 shrink-0 mx-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ค้นหาเบอร์โทร, ชื่อ, รุ่นเครื่อง, หรือรหัสคิว..."
                    className="pl-9 h-9 text-sm border-rose-200 focus-visible:ring-rose-500"
                    value={trashSearchQuery}
                    onChange={(e) => setTrashSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto mt-4 space-y-3 px-2 pb-4">
                  {filteredTrashedJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                      <Search className="h-10 w-10 opacity-20" />
                      <p className="text-sm">{trashSearchQuery ? "ไม่พบข้อมูลที่ค้นหา" : "ไม่มีงานในถังขยะ"}</p>
                    </div>
                  ) : (
                    filteredTrashedJobs.map(job => (
                      <Card key={job.id} className="shadow-sm border-rose-100 bg-white">
                        <CardHeader className="p-3 pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 mb-1">
                                {job.jobRef}
                              </Badge>
                              <CardTitle className="text-sm font-bold">
                                {job.deviceModel} {job.deviceColor && <span className="text-xs font-normal text-slate-500">(สี{job.deviceColor})</span>}
                              </CardTitle>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded">
                                {job.cancelReason === "NO_SHOW" && "ลูกค้าไม่มา"}
                                {job.cancelReason === "CUSTOMER_CANCEL" && "ลูกค้าไม่ซ่อมแล้ว"}
                                {job.cancelReason === "UNREPAIRABLE" && "ซ่อมไม่ได้"}
                                {job.cancelReason === "NO_PARTS" && "ไม่มีอะไหล่"}
                                {job.cancelReason === "UNCONTACTABLE" && "ติดต่อไม่ได้/ทิ้งเครื่อง"}
                                {!job.cancelReason && "ยกเลิกงาน"}
                              </span>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-[10px] text-slate-400 cursor-help whitespace-nowrap">
                                    {formatShortDate(job.createdAt)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{formatFullDateTime(job.createdAt)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 text-xs text-slate-600 space-y-1">
                          <p><span className="font-semibold">ลูกค้า:</span> {job.customerName} {(job.phoneNumber || job.phone) && <span className="text-slate-500">({formatPhoneNumber(job.phoneNumber || job.phone)})</span>}</p>
                          <p><span className="font-semibold">บริการ:</span> {job.serviceName || "ทั่วไป"}</p>
                          
                          {job.estimatedPrice && (
                            <p><span className="font-semibold">ประเมิน:</span> <span className="text-blue-600 font-medium">฿{job.estimatedPrice}</span></p>
                          )}
                          
                          {(job.serialNumber || job.imei) && (
                            <div className="pt-1.5 mt-1 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                              {job.serialNumber && <p className="flex items-center gap-1"><span className="font-semibold">S/N:</span> {job.serialNumber}</p>}
                              {job.imei && <p className="flex items-center gap-1"><span className="font-semibold">IMEI:</span> {job.imei}</p>}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="p-3 pt-0 flex gap-2 border-t border-slate-50 mt-2">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => restoreJob(job.id)} disabled={updateJobMutation.isPending}>
                            <RotateCcw className="h-3 w-3 mr-1" /> คืนค่า
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-rose-600 border-rose-300 hover:bg-rose-50 hover:border-rose-400" onClick={() => setJobToDelete(job)}>
                            ลบถาวร
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
                
                {trashedJobs.length > 0 && (
                  <div className="pt-4 border-t shrink-0 px-2 pb-4">
                    <Button variant="destructive" className="w-full" onClick={() => setIsConfirmEmptyOpen(true)}>
                      <AlertCircle className="mr-2 h-4 w-4" /> ล้างถังขยะทั้งหมด (Empty Bin)
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> สร้างใบสั่งซ่อม
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] p-0 border-none bg-transparent shadow-none">
                <DialogTitle className="sr-only">สร้างใบสั่งซ่อมใหม่</DialogTitle>
                <ShopOwnerCreateQueue
                  onCancel={() => setIsCreateOpen(false)}
                  onSuccess={() => {
                    setIsCreateOpen(false)
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex-1 overflow-x-hidden md:overflow-x-auto pb-4">
          {allJobs.length === 0 && lastSyncAt === 0 ? (
            <div className="flex h-[450px] w-full items-center justify-center text-slate-400 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              <p>กำลังโหลดข้อมูลคิว...</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 h-full md:items-start md:justify-center">
              {COLUMNS.map((col) => {
                const columnJobs = activeJobs.filter(j => j.status === col.id)
                const Icon = col.icon
                return (
                  <div key={col.id} className={`w-full md:w-[320px] md:shrink-0 rounded-xl border-2 flex flex-col h-[450px] md:h-full overflow-hidden ${col.color}`}>
                    <div className="p-3 border-b border-black/5 bg-white/50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${col.iconColor}`} />
                        <h3 className="font-bold text-slate-700">{col.title}</h3>
                      </div>
                      <Badge variant="secondary" className="font-bold shadow-sm">
                        {columnJobs.length}
                      </Badge>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-3">
                      <div className="space-y-3 pb-2">
                        {columnJobs.length === 0 ? (
                          <div className="text-center p-4 py-8 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                            ไม่มีงานในสถานะนี้
                          </div>
                        ) : (
                          columnJobs.map((job) => (
                            <Card key={job.id} className="shadow-sm border-slate-200 hover:border-emerald-300 transition-colors cursor-default relative group">
                              <CardHeader className="p-3 pb-2 flex flex-row items-start justify-between space-y-0">
                                <div>
                                  <Badge variant="outline" className={`text-white border-transparent ${col.badgeColor} mb-1`}>
                                    {job.jobRef}
                                  </Badge>
                                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                                    <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span className="truncate">
                                      {job.deviceModel} {job.deviceColor && <span className="text-xs font-normal text-slate-500">(สี{job.deviceColor})</span>}
                                    </span>
                                  </CardTitle>
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuItem className="cursor-pointer" onClick={() => setJobToView(job)}>
                                      <ClipboardList className="mr-2 h-4 w-4 text-blue-600" />
                                      รายละเอียด / ประเมินราคา
                                    </DropdownMenuItem>

                                    {col.id !== "REPAIRED" ? (
                                      <DropdownMenuItem className="text-rose-600 focus:bg-rose-50 focus:text-rose-700 cursor-pointer" onClick={() => setJobToCancel(job)}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        ยกเลิกงาน
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem className="text-amber-600 focus:bg-amber-50 focus:text-amber-700 cursor-pointer" onClick={() => handleMoveToArchive(job.id, job.jobRef)}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        ย้ายเครื่องเข้าคลัง
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </CardHeader>

                              <CardContent className="p-3 pt-0 text-sm space-y-2">
                                <div className="flex items-center justify-between text-slate-600">
                                  <span className="font-medium truncate mr-2">
                                    {job.customerName} {(job.phoneNumber || job.phone) && <span className="text-xs text-slate-400 font-normal">({formatPhoneNumber(job.phoneNumber || job.phone)})</span>}
                                  </span>
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 cursor-help">
                                        {job.timeElapsed || formatShortDate(job.createdAt)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{formatFullDateTime(job.createdAt)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs text-slate-600 flex flex-col gap-1">
                                  <div><span className="font-semibold text-emerald-700">[{job.serviceName || "ทั่วไป"}]</span> {job.issue || "-"}</div>
                                  {job.estimatedPrice && (
                                    <div className="text-blue-600 font-medium">ประเมิน: ฿{job.estimatedPrice}</div>
                                  )}
                                  
                                  {(job.serialNumber || job.imei) && (
                                    <div className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500">
                                      {job.serialNumber && <div className="flex items-center gap-1.5">S/N: {job.serialNumber}</div>}
                                      {job.imei && <div className="flex items-center gap-1.5">IMEI: {job.imei}</div>}
                                    </div>
                                  )}
                                </div>
                              </CardContent>

                              <CardFooter className="p-3 pt-0 flex gap-2">
                                <Button
                                  onClick={() => moveJob(job.id, job.status)}
                                  disabled={updateJobMutation.isPending}
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
          )}
        </div>

        <Dialog open={!!jobToView} onOpenChange={(open) => { if (!open) setJobToView(null) }}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-xl">
                  รายละเอียดคิว <span className="text-blue-600">{jobToView?.jobRef}</span>
                </DialogTitle>
                <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {jobToView ? translateStatus(jobToView.status) : ""}
                </span>
              </div>
              <DialogDescription>
                ตรวจสอบข้อมูลลูกค้าและบันทึกรายละเอียดเชิงลึกสำหรับงานซ่อม
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-2">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">ลูกค้า</span>
                    <p className="font-medium text-slate-900">
                      {jobToView?.customerName} {jobToView?.phoneNumber && <span className="text-slate-500 font-normal">({formatPhoneNumber(jobToView.phoneNumber)})</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">บริการ / อาการ</span>
                    <p className="font-medium text-emerald-700">{jobToView?.serviceName || "ทั่วไป"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">รุ่นเครื่อง</span>
                    <p className="font-medium text-slate-900">
                      {jobToView?.deviceModel} {jobToView?.deviceColor && <span className="text-slate-500 font-normal">(สี{jobToView.deviceColor})</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">Serial Number</span>
                    <p className="font-medium text-slate-900">{jobToView?.serialNumber || "-"}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 text-xs">IMEI</span>
                    <p className="font-medium text-slate-900">{jobToView?.imei || "-"}</p>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1 text-xs">หมายเหตุเพิ่มเติม</span>
                    <p className="font-medium text-slate-900">{jobToView?.issue || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Wrench className="h-4 w-4 text-slate-500" /> ข้อมูลสำหรับช่าง (ไม่บังคับ)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="estimatedPrice" className="text-slate-600 flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5" /> ราคาประเมิน (บาท)
                    </Label>
                    <Input
                      id="estimatedPrice"
                      type="number"
                      placeholder="เช่น 1500"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="max-w-[200px]"
                      disabled={updateJobMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serialNumber" className="text-slate-600 flex items-center gap-1">
                      <Barcode className="h-3.5 w-3.5" /> Serial Number
                    </Label>
                    <Input
                      id="serialNumber"
                      placeholder="กรอก S/N เครื่อง"
                      value={editSn}
                      onChange={(e) => setEditSn(e.target.value)}
                      disabled={updateJobMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imei" className="text-slate-600 flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" /> IMEI
                    </Label>
                    <Input
                      id="imei"
                      placeholder="กรอกเลข IMEI 15 หลัก"
                      value={editImei}
                      onChange={(e) => setEditImei(e.target.value)}
                      disabled={updateJobMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-end sm:space-x-3 mt-4">
              <Button variant="outline" onClick={() => setJobToView(null)} disabled={updateJobMutation.isPending}>ปิดหน้าต่าง</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveDetails} disabled={updateJobMutation.isPending}>
                {updateJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                บันทึกข้อมูลช่าง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!jobToCancel} onOpenChange={(open) => {
          if (!open) {
            setJobToCancel(null)
            setCancelReason("")
          }
        }}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-rose-600 flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5" />
                ยืนยันการยกเลิกงาน
              </DialogTitle>
              <DialogDescription className="pt-2 text-slate-600">
                คุณกำลังจะยกเลิกคิว <span className="font-bold text-slate-800">{jobToCancel?.jobRef}</span> ของคุณ <span className="font-medium text-slate-800">{jobToCancel?.customerName}</span>
                <br className="mb-2" />กรุณาระบุเหตุผลในการยกเลิก เพื่อเก็บเป็นสถิติ:
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <RadioGroup value={cancelReason} onValueChange={(val) => setCancelReason(val as CancelReason)} className="flex flex-col gap-3">
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setCancelReason("CUSTOMER_CANCEL")}>
                  <RadioGroupItem value="CUSTOMER_CANCEL" id="r1" disabled={updateJobMutation.isPending} />
                  <Label htmlFor="r1" className="cursor-pointer flex-1 font-medium text-slate-700">ลูกค้าเปลี่ยนใจ / ไม่ซ่อมแล้ว</Label>
                </div>
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setCancelReason("NO_SHOW")}>
                  <RadioGroupItem value="NO_SHOW" id="r2" disabled={updateJobMutation.isPending} />
                  <Label htmlFor="r2" className="cursor-pointer flex-1 font-medium text-slate-700">ลูกค้าไม่มาส่งเครื่องตามนัด</Label>
                </div>
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setCancelReason("UNREPAIRABLE")}>
                  <RadioGroupItem value="UNREPAIRABLE" id="r3" disabled={updateJobMutation.isPending} />
                  <Label htmlFor="r3" className="cursor-pointer flex-1 font-medium text-slate-700">เครื่องซ่อมไม่ได้ / บอร์ดพังหนัก</Label>
                </div>
                <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setCancelReason("NO_PARTS")}>
                  <RadioGroupItem value="NO_PARTS" id="r4" disabled={updateJobMutation.isPending} />
                  <Label htmlFor="r4" className="cursor-pointer flex-1 font-medium text-slate-700">ไม่มีอะไหล่ / อะไหล่เลิกผลิต</Label>
                </div>
              </RadioGroup>
            </div>

            <DialogFooter className="gap-3 mt-4 flex flex-row justify-end">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setJobToCancel(null); setCancelReason("") }} disabled={updateJobMutation.isPending}>
                ปิดหน้าต่าง
              </Button>
              <Button variant="destructive" className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700" onClick={confirmCancelJob} disabled={!cancelReason || updateJobMutation.isPending}>
                {updateJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                ยืนยันการยกเลิกคิว
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isConfirmEmptyOpen} onOpenChange={setIsConfirmEmptyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ยืนยันการล้างถังขยะ?</DialogTitle>
              <DialogDescription>การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลที่ลบจะหายไปอย่างถาวร</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmEmptyOpen(false)}>ยกเลิก</Button>
              <Button variant="destructive" onClick={confirmEmptyTrash}>ยืนยันลบถาวร</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  )
}