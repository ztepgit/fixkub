"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import {
  Smartphone,
  Wrench,
  Clock,
  Plus,
  PackageCheck,
  MoreHorizontal,
  ClipboardList,
  XCircle,
  Trash2,
  RotateCcw,
  AlertCircle,
  Archive,
  Banknote,
  Barcode,
  Hash,
  Loader2,
  CheckCircle2,
  UserX
} from "lucide-react"
import { ShopOwnerCreateQueue } from "@/components/shop-owner-create-queue"
import { getQueues, updateQueueStatus } from "@/actions/queue"

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
  cancelledAt?: Date
  estimatedPrice?: string
  serialNumber?: string
  imei?: string
}

const COLUMNS = [
  { id: "PENDING", title: "ลูกค้าแจ้งซ่อม", color: "border-slate-300 bg-slate-50", icon: ClipboardList, iconColor: "text-slate-500", badgeColor: "bg-slate-500" },
  { id: "WAITING", title: "รอคิวซ่อม", color: "border-orange-200 bg-orange-50", icon: Clock, iconColor: "text-orange-500", badgeColor: "bg-orange-500" },
  { id: "PROCESSING", title: "กำลังแกะซ่อม", color: "border-blue-200 bg-blue-50", icon: Wrench, iconColor: "text-blue-500", badgeColor: "bg-blue-500" },
  { id: "REPAIRED", title: "ซ่อมเสร็จ / รอรับ", color: "border-emerald-200 bg-emerald-50", icon: PackageCheck, iconColor: "text-emerald-600", badgeColor: "bg-emerald-500" },
]

export function QueueBoard() {
  const [jobs, setJobs] = useState<RepairJob[]>([])
  const [trashedJobs, setTrashedJobs] = useState<RepairJob[]>([])
  const [archivedJobs, setArchivedJobs] = useState<RepairJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [jobToCancel, setJobToCancel] = useState<RepairJob | null>(null)
  const [cancelReason, setCancelReason] = useState<CancelReason | "">("")

  const [jobToDelete, setJobToDelete] = useState<RepairJob | null>(null)
  const [isConfirmEmptyOpen, setIsConfirmEmptyOpen] = useState(false)

  const [jobToView, setJobToView] = useState<RepairJob | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editSn, setEditSn] = useState("")
  const [editImei, setEditImei] = useState("")

  const { toast } = useToast()

  const loadQueues = async () => {
    setIsLoading(true)
    const response = await getQueues("shop_test_001")
    if (response.success && response.data) {
      const formattedData = response.data.map((job: any) => ({
        ...job,
        jobRef: job.jobRef || `Q-${job.id.slice(-4).toUpperCase()}`,
      }))

      const activeJobs = formattedData.filter((j: any) =>
        j.status !== "CANCELLED" &&
        j.status !== "COMPLETED" &&
        j.status !== "ARCHIVED"
      )
      const cancelledJobs = formattedData.filter((j: any) => j.status === "CANCELLED")
      const archived = formattedData.filter((j: any) => j.status === "ARCHIVED")

      setJobs(activeJobs)
      setTrashedJobs(cancelledJobs)
      setArchivedJobs(archived)
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถโหลดข้อมูลคิวได้", variant: "destructive" })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadQueues()

    const channel = supabase
      .channel('queue_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Queue' },
        (payload) => {
          loadQueues()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (jobToView) {
      setEditPrice(jobToView.estimatedPrice || "")
      setEditSn(jobToView.serialNumber || "")
      setEditImei(jobToView.imei || "")
    }
  }, [jobToView])

  const moveJob = async (jobId: string, currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      "PENDING": "WAITING",
      "WAITING": "PROCESSING",
      "PROCESSING": "REPAIRED",
      "REPAIRED": "COMPLETED"
    }
    const nextStatus = statusFlow[currentStatus]

    if (nextStatus === "COMPLETED") {
      setJobs(jobs.filter(j => j.id !== jobId))
      toast({ title: "✅ ปิดจ๊อบสำเร็จ", description: "ลูกค้ามารับเครื่องเรียบร้อยแล้ว" })
      await updateQueueStatus(jobId, nextStatus, { completedAt: new Date() })
    } else {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: nextStatus as any } : j))
      const res = await updateQueueStatus(jobId, nextStatus)
      if (!res.success) {
        toast({ title: "Error", description: "บันทึกข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าจอ", variant: "destructive" })
        loadQueues()
      }
    }
  }

  const handleSaveDetails = () => {
    if (!jobToView) return
    setJobs(jobs.map(j => j.id === jobToView.id ? { ...j, estimatedPrice: editPrice, serialNumber: editSn, imei: editImei } : j))
    toast({ title: "💾 บันทึกข้อมูลสำเร็จ", description: `อัปเดตรายละเอียดคิว ${jobToView.jobRef} เรียบร้อยแล้ว` })
    setJobToView(null)
  }

  const confirmCancelJob = async () => {
    if (!jobToCancel || !cancelReason) return

    const cancelledJob: RepairJob = {
      ...jobToCancel,
      status: "CANCELLED",
      cancelReason: cancelReason as CancelReason,
      cancelledAt: new Date()
    }

    setJobs(prev => prev.filter(j => j.id !== jobToCancel.id))
    setTrashedJobs(prev => [cancelledJob, ...prev])

    setJobToCancel(null)
    setCancelReason("")

    await updateQueueStatus(jobToCancel.id, "CANCELLED", {
      cancelReason: cancelReason,
      cancelledAt: new Date()
    })

    toast({ title: "🗑️ ยกเลิกงานเรียบร้อย", description: `ย้ายคิว ${jobToCancel.jobRef} ไปที่ถังขยะแล้ว`, duration: 5000 })
  }

  const restoreJob = async (jobId: string) => {
    const jobToRestore = trashedJobs.find(j => j.id === jobId)
    if (!jobToRestore) return

    const isUncontactable = jobToRestore.cancelReason === "UNCONTACTABLE"
    const targetStatus = isUncontactable ? "ARCHIVED" : "PENDING"

    const restoredJob = {
      ...jobToRestore,
      status: targetStatus as any,
      cancelReason: undefined,
      cancelledAt: undefined
    }

    setTrashedJobs(prev => prev.filter(j => j.id !== jobId))

    if (isUncontactable) {
      setArchivedJobs(prev => [...prev, restoredJob])
    } else {
      setJobs(prev => [...prev, restoredJob])
    }

    await updateQueueStatus(jobId, targetStatus, { cancelReason: null, cancelledAt: null })

    toast({
      title: "🔄 คืนค่างานสำเร็จ",
      description: isUncontactable
        ? `รายการ ${jobToRestore.jobRef} ถูกดึงกลับเข้าคลังแล้ว`
        : `คิว ${jobToRestore.jobRef} กลับสู่กระดานคิวแล้ว`,
      duration: 3000,
    })
  }

  const confirmDeletePermanently = () => {
    if (!jobToDelete) return
    setTrashedJobs(prev => prev.filter(j => j.id !== jobToDelete.id))
    toast({ variant: "destructive", title: "🗑️ ลบข้อมูลถาวรแล้ว", description: `คิว ${jobToDelete.jobRef} ถูกลบออกจากระบบอย่างถาวร` })
    setJobToDelete(null)
  }

  const confirmEmptyTrash = () => {
    setTrashedJobs([])
    toast({ variant: "destructive", title: "💥 เทถังขยะเรียบร้อยแล้ว", description: "งานที่ถูกยกเลิกทั้งหมดถูกลบถาวรแล้ว" })
    setIsConfirmEmptyOpen(false)
  }

  const handleMoveToArchive = async (jobId: string, jobRef: string) => {
    setJobs(jobs.filter(j => j.id !== jobId))
    toast({ title: "📦 ย้ายเครื่องเข้าคลัง", description: `รายการ ${jobRef} ถูกย้ายไปยังคลังเครื่องค้างแล้ว`, duration: 3000 })
    const res = await updateQueueStatus(jobId, "ARCHIVED")
    if (!res.success) loadQueues()
  }

  const unarchiveJob = async (jobId: string) => {
    const jobToUnarchive = archivedJobs.find(j => j.id === jobId)
    if (!jobToUnarchive) return
    setArchivedJobs(prev => prev.filter(j => j.id !== jobId))
    setJobs(prev => [...prev, { ...jobToUnarchive, status: "REPAIRED" as any }])
    await updateQueueStatus(jobId, "REPAIRED")
    toast({ title: "🔄 ดึงกลับหน้ากระดาน", description: `รายการ ${jobToUnarchive.jobRef} ถูกดึงกลับมาที่ช่องรอรับแล้ว` })
  }

  const completeArchivedJob = async (jobId: string) => {
    setArchivedJobs(prev => prev.filter(j => j.id !== jobId))
    toast({ title: "✅ ปิดจ๊อบสำเร็จ", description: "ลูกค้ามารับเครื่องจากคลังเรียบร้อยแล้ว" })
    await updateQueueStatus(jobId, "COMPLETED", { completedAt: new Date() })
  }

  const markAsUncontactable = async (jobId: string, jobRef: string) => {
    const job = archivedJobs.find(j => j.id === jobId)
    if (!job) return

    const abandonedJob = { ...job, status: "CANCELLED" as const, cancelReason: "UNCONTACTABLE" as CancelReason, cancelledAt: new Date() }

    setArchivedJobs(prev => prev.filter(j => j.id !== jobId))
    setTrashedJobs(prev => [abandonedJob, ...prev])

    toast({ title: "❌ ส่งไปถังขยะ", description: `รายการ ${jobRef} ถูกบันทึกว่าติดต่อไม่ได้` })

    await updateQueueStatus(jobId, "CANCELLED", {
      cancelReason: "UNCONTACTABLE",
      cancelledAt: new Date()
    })
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

  return (
    <div className="flex flex-col min-h-screen md:min-h-0 md:h-[calc(100vh-8rem)]">

      {/* ส่วนหัวกระดาน & ปุ่มถังขยะ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">กระดานคิวงานซ่อม</h2>
          <p className="text-sm text-slate-500">อัปเดตสถานะงานซ่อมได้ง่ายๆ</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">

          {/* 🌟 Sheet คลังเครื่องค้าง */}
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
              <SheetHeader className="shrink-0">
                <SheetTitle className="flex items-center gap-2 text-amber-600">
                  <Archive className="h-5 w-5" /> คลังดอง
                </SheetTitle>
                <SheetDescription>
                  งานที่ซ่อมเสร็จแล้ว แต่ลูกค้ายังไม่มารับ
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto mt-6 space-y-3">
                {archivedJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                    <Archive className="h-10 w-10 opacity-20" />
                    <p className="text-sm">ไม่มีรายการ</p>
                  </div>
                ) : (
                  archivedJobs.map(job => (
                    <Card key={job.id} className="shadow-sm border-amber-200 bg-white">
                      <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 mb-1">
                              {job.jobRef}
                            </Badge>
                            <CardTitle className="text-sm font-bold">{job.deviceModel}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-xs text-slate-600 space-y-1">
                        <p><span className="font-semibold">ลูกค้า:</span> {job.customerName} {job.phone && `(${job.phone})`}</p>
                        <p><span className="font-semibold">บริการ:</span> {job.serviceName || "ทั่วไป"}</p>
                      </CardContent>

                      <CardFooter className="p-3 pt-0 flex flex-col gap-2 border-t border-slate-50 mt-2">
                        <Button
                          className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => completeArchivedJob(job.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> ลูกค้ามารับเครื่อง (ปิดจ๊อบ)
                        </Button>
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => unarchiveJob(job.id)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> ดึงกลับ
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => markAsUncontactable(job.id, job.jobRef)}
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

          {/* 🌟 ถังขยะ */}
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
              <SheetHeader className="shrink-0">
                <SheetTitle className="flex items-center gap-2 text-rose-600">
                  <Trash2 className="h-5 w-5" /> ถังขยะ (งานที่ถูกยกเลิก)
                </SheetTitle>
                <SheetDescription>
                  งานในถังขยะจะถูกลบถาวรอัตโนมัติเมื่อครบ 30 วัน
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto mt-6 space-y-3">
                {trashedJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 space-y-2">
                    <Trash2 className="h-10 w-10 opacity-20" />
                    <p className="text-sm">ไม่มีงานในถังขยะ</p>
                  </div>
                ) : (
                  trashedJobs.map(job => (
                    <Card key={job.id} className="shadow-sm border-rose-100 bg-white">
                      <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 mb-1">
                              {job.jobRef}
                            </Badge>
                            <CardTitle className="text-sm font-bold">{job.deviceModel}</CardTitle>
                          </div>
                          <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-1 rounded">
                            {job.cancelReason === "NO_SHOW" && "ลูกค้าไม่มา"}
                            {job.cancelReason === "CUSTOMER_CANCEL" && "ลูกค้าไม่ซ่อมแล้ว"}
                            {job.cancelReason === "UNREPAIRABLE" && "ซ่อมไม่ได้"}
                            {job.cancelReason === "NO_PARTS" && "ไม่มีอะไหล่"}
                            {job.cancelReason === "UNCONTACTABLE" && "ติดต่อไม่ได้/ทิ้งเครื่อง"}
                            {!job.cancelReason && "ยกเลิกงาน"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-xs text-slate-600">
                        <p><span className="font-semibold">ลูกค้า:</span> {job.customerName}</p>
                      </CardContent>
                      <CardFooter className="p-3 pt-0 flex gap-2 border-t border-slate-50 mt-2">
                        {/* 🌟 เอาเงื่อนไขที่ซ่อนปุ่มออกแล้ว คืนค่าได้ทุกกรณี */}
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => restoreJob(job.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> คืนค่า
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-rose-600 hover:bg-rose-50" onClick={() => setJobToDelete(job)}>
                          ลบถาวร
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>

              {trashedJobs.length > 0 && (
                <div className="pt-4 border-t shrink-0">
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
              <ShopOwnerCreateQueue
                onCancel={() => setIsCreateOpen(false)}
                onSuccess={() => {
                  setIsCreateOpen(false)
                  loadQueues()
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* กระดาน Kanban */}
      <div className="flex-1 overflow-x-hidden md:overflow-x-auto pb-4">
        {isLoading ? (
          <div className="flex h-[450px] w-full items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <p>กำลังโหลดข้อมูลคิว...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 h-full md:items-start md:justify-center">
            {COLUMNS.map((col) => {
              const columnJobs = jobs.filter(j => j.status === col.id)
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
                                  <Smartphone className="h-4 w-4 text-emerald-600" />
                                  {job.deviceModel}
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
                                <span className="font-medium">{job.customerName}</span>
                                <span className="text-xs">{job.timeElapsed}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs text-slate-600 flex flex-col gap-1">
                                <div><span className="font-semibold text-emerald-700">[{job.serviceName || "ทั่วไป"}]</span> {job.issue || "-"}</div>
                                {job.estimatedPrice && (
                                  <div className="text-blue-600 font-medium">ประเมิน: ฿{job.estimatedPrice}</div>
                                )}
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
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                  <span className="text-slate-500 block mb-1 text-xs">ลูกค้า</span>
                  <p className="font-medium text-slate-900">
                    {jobToView?.customerName} {jobToView?.phone && <span className="text-slate-500 font-normal">({jobToView.phone})</span>}
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
                  <Input id="estimatedPrice" type="number" placeholder="เช่น 1500" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="max-w-[200px]" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serialNumber" className="text-slate-600 flex items-center gap-1">
                    <Barcode className="h-3.5 w-3.5" /> Serial Number
                  </Label>
                  <Input id="serialNumber" placeholder="กรอก S/N เครื่อง" value={editSn} onChange={(e) => setEditSn(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imei" className="text-slate-600 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" /> IMEI
                  </Label>
                  <Input id="imei" placeholder="กรอกเลข IMEI 15 หลัก" value={editImei} onChange={(e) => setEditImei(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setJobToView(null)}>ปิดหน้าต่าง</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveDetails}>
              บันทึกข้อมูลช่าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!jobToCancel} onOpenChange={(open) => { if (!open) setJobToCancel(null) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> ยกเลิกงานนี้ ?
            </DialogTitle>
            <DialogDescription>
              กรุณาระบุเหตุผลการยกเลิกคิวซ่อมรหัส <span className="font-bold text-slate-800">{jobToCancel?.jobRef}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={cancelReason} onValueChange={(val) => setCancelReason(val as CancelReason)}>
              {(jobToCancel?.status === "PENDING" || jobToCancel?.status === "WAITING") && (
                <>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="NO_SHOW" id="r-no-show" />
                    <Label htmlFor="r-no-show" className="flex-1 cursor-pointer font-medium">ลูกค้าไม่มา</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="CUSTOMER_CANCEL" id="r-cust-cancel-1" />
                    <Label htmlFor="r-cust-cancel-1" className="flex-1 cursor-pointer font-medium">ลูกค้าไม่ซ่อมแล้ว</Label>
                  </div>
                </>
              )}
              {jobToCancel?.status === "PROCESSING" && (
                <>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="UNREPAIRABLE" id="r-unrepairable" />
                    <Label htmlFor="r-unrepairable" className="flex-1 cursor-pointer font-medium">ซ่อมไม่ได้</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="NO_PARTS" id="r-no-parts" />
                    <Label htmlFor="r-no-parts" className="flex-1 cursor-pointer font-medium">ไม่มีอะไหล่</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50">
                    <RadioGroupItem value="CUSTOMER_CANCEL" id="r-cust-cancel-2" />
                    <Label htmlFor="r-cust-cancel-2" className="flex-1 cursor-pointer font-medium">ลูกค้าไม่ซ่อมแล้ว</Label>
                  </div>
                </>
              )}
            </RadioGroup>
          </div>
          <DialogFooter className="gap-3 sm:space-x-3 mt-4">
            <Button variant="outline" onClick={() => setJobToCancel(null)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={!cancelReason} onClick={confirmCancelJob}>ยืนยันการยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!jobToDelete} onOpenChange={(open) => { if (!open) setJobToDelete(null) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> ยืนยันลบข้อมูลถาวร ?
            </DialogTitle>
            <DialogDescription className="pt-2">
              คุณกำลังจะลบรายการ <span className="font-bold text-slate-800">{jobToDelete?.jobRef}</span> ออกจากระบบ
              <br /><br />
              <span className="text-rose-500 font-medium">การกระทำนี้ไม่สามารถกู้คืนได้</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:space-x-3 mt-4">
            <Button variant="outline" onClick={() => setJobToDelete(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={confirmDeletePermanently}>ลบข้อมูลถาวร</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmEmptyOpen} onOpenChange={setIsConfirmEmptyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" /> ยืนยันล้างถังขยะ ?
            </DialogTitle>
            <DialogDescription className="pt-2">
              คุณกำลังจะลบงานที่ถูกยกเลิกทั้งหมดจำนวน <span className="font-bold text-slate-800">{trashedJobs.length}</span> รายการ
              <br /><br />
              <span className="text-rose-500 font-medium">การกระทำนี้ไม่สามารถกู้คืนได้</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:space-x-3 mt-4">
            <Button variant="outline" onClick={() => setIsConfirmEmptyOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={confirmEmptyTrash}>ล้างถังขยะทั้งหมด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}