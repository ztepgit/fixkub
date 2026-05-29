"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Wrench, Banknote, Barcode, Hash, Loader2, Image as ImageIcon, Plus, Trash2, CalendarClock, X } from "lucide-react" // 🌟 เพิ่ม Icon ที่จำเป็น
import { useToast } from "@/hooks/use-toast"
import { compressImageToWebP, extractUploadDateFromUrl } from "@/lib/image-utils" // 🌟 นำเข้า Helper
import { supabase } from "@/lib/supabase"
import { updateQueueImages, deleteQueueImage } from "@/actions/queue"

// 🌟 1. กำหนด Interface รับค่ามาจาก QueueBoard
interface QueueDetailDialogProps {
  job: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (jobId: string, data: { estimatedPrice: string, serialNumber: string, imei: string }) => Promise<void>
  onUpdateJobInStore: (job: any) => void 
}

export function QueueDetailDialog({ job, open, onOpenChange, onSave, onUpdateJobInStore }: QueueDetailDialogProps) {
  const { toast } = useToast()
  
  // State สำหรับข้อมูลที่ช่างต้องกรอกเพิ่ม
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [imei, setImei] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // QUEUE IMAGE SYSTEM: States
  const [isUploading, setIsUploading] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null) // 🌟 State สำหรับขยายรูปใหญ่

  // 🌟 2. ดึงค่าเดิมของคิวนี้มาใส่ในช่อง Input อัตโนมัติเวลาเปิดขึ้นมา
  useEffect(() => {
    if (job) {
      setEstimatedPrice(job.estimatedPrice || "")
      setSerialNumber(job.serialNumber || "")
      setImei(job.imei || "")
    }
  }, [job])

  const handleSave = async () => {
    if (!job) return
    setIsSaving(true)
    
    // ส่งข้อมูลกลับไปให้ QueueBoard จัดการต่อ
    await onSave(job.id, { estimatedPrice, serialNumber, imei })
    
    setIsSaving(false)
  }

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return ""
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    if (cleaned.length === 9) return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`
    return phone
  }

  // 🌟 QUEUE IMAGE SYSTEM: อัปโหลดรูปตรงเข้า Storage ทันที (Direct Upload)
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentImagesCount = job?.images?.length || 0;

    if (currentImagesCount + files.length > 4) {
      toast({ title: "❌ เลือกได้สูงสุด 4 รูป", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const newUrls: string[] = [];

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: `❌ รูป ${file.name} เกิน 5MB`, variant: "destructive" });
          continue;
        }

        const compressedFile = await compressImageToWebP(file);
        
        // สุ่มชื่อไฟล์
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const filePath = `${job.shopId}/${job.id}/${fileName}`;
        
        const { data, error } = await supabase.storage.from('queue-images').upload(filePath, compressedFile);
        
        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage.from('queue-images').getPublicUrl(filePath);
          newUrls.push(publicUrl);
        }
      }

      if (newUrls.length > 0) {
        const finalImages = [...(job.images || []), ...newUrls];
        // ยิง API เซฟลง DB
        const res = await updateQueueImages(job.shopId, job.id, finalImages);
        if (res.success) {
          // อัปเดต Object ปัจจุบันให้ UI หน้า Dialog นี้เปลี่ยนตาม
          const updatedJob = { ...job, images: finalImages };
          onUpdateJobInStore(updatedJob); 
          toast({ title: "✅ อัปโหลดรูปสำเร็จ" });
        }
      }
    } catch (err: any) {
      toast({ title: "❌ อัปโหลดไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      // เคลียร์ค่า input file เพื่อให้เลือกไฟล์เดิมซ้ำได้
      if (e.target) e.target.value = '';
    }
  }

  // 🌟 QUEUE IMAGE SYSTEM: ลบรูปตรงออกจาก Storage (Direct Delete)
  const handleDeleteImage = async (urlToRemove: string) => {
    if (!job) return;
    setIsUploading(true); 
    try {
      const res = await deleteQueueImage(job.shopId, job.id, urlToRemove);
      if (res.success) {
        const updatedJob = { ...job, images: res.images };
        onUpdateJobInStore(updatedJob); 
        toast({ title: "🗑️ ลบรูปภาพแล้ว" });
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({ title: "❌ ลบรูปไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }

  // 🌟 ฟังก์ชันแปลสถานะเป็นภาษาไทย
  const translateStatus = (status: string) => {
    switch (status) {
      case "PENDING": return "รอยืนยัน"
      case "WAITING": return "รอคิวซ่อม"
      case "PROCESSING": return "กำลังซ่อม"
      case "REPAIRED": return "ซ่อมเสร็จแล้ว"
      case "COMPLETED": return "ปิดจ๊อบ"
      case "CANCELLED": return "ยกเลิกแล้ว"
      case "ARCHIVED": return "เข้าคลังดอง"
      default: return status
    }
  }

  if (!job) return null 

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-xl dark:text-slate-100">
                รายละเอียดคิว <span className="text-blue-600 dark:text-blue-400">{job.jobRef || "รอรันเลขบิล"}</span>
              </DialogTitle>
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700">
                {translateStatus(job.status)}
              </span>
            </div>
            <DialogDescription className="dark:text-slate-400">
              ตรวจสอบข้อมูลลูกค้าและบันทึกรายละเอียดเชิงลึกสำหรับงานซ่อม
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            {/* Section 1: ข้อมูลเบื้องต้น */}
            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs">ลูกค้า</span>
                  <p className="font-medium text-slate-900 dark:text-slate-200">
                    {job?.customerName} {job?.phoneNumber && <span className="text-slate-500 dark:text-slate-400 font-normal">({formatPhoneNumber(job.phoneNumber)})</span>}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs">บริการ / อาการ</span>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">{job?.serviceName || "ทั่วไป"}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs">รุ่นเครื่อง</span>
                  <p className="font-medium text-slate-900 dark:text-slate-200">
                    {job?.deviceModel} {job?.deviceColor && <span className="text-slate-500 dark:text-slate-400 font-normal">(สี{job.deviceColor})</span>}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs">Serial Number</span>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{job?.serialNumber || "-"}</p>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs">IMEI</span>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{job?.imei || "-"}</p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 text-xs">หมายเหตุเพิ่มเติม</span>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{job?.issue || "-"}</p>
                </div>
              </div>
            </div>

            {/* Section 2: ฟอร์มสำหรับช่าง (Editable) */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b dark:border-slate-800 pb-2">
                <Wrench className="h-4 w-4 text-slate-500 dark:text-slate-400" /> ข้อมูลสำหรับช่าง (ไม่บังคับ)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="estimatedPrice" className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5" /> ราคาประเมิน (บาท)
                  </Label>
                  <Input
                    id="estimatedPrice"
                    type="number"
                    placeholder="เช่น 1500"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    className="max-w-[200px] dark:bg-slate-950 dark:border-slate-700"
                    disabled={isSaving || isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serialNumber" className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Barcode className="h-3.5 w-3.5" /> Serial Number
                  </Label>
                  <Input
                    id="serialNumber"
                    placeholder="กรอก S/N เครื่อง"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="dark:bg-slate-950 dark:border-slate-700"
                    disabled={isSaving || isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imei" className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" /> IMEI
                  </Label>
                  <Input
                    id="imei"
                    placeholder="กรอกเลข IMEI 15 หลัก"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    className="dark:bg-slate-950 dark:border-slate-700"
                    disabled={isSaving || isUploading}
                  />
                </div>
              </div>
            </div>

            {/* 🌟 QUEUE IMAGE SYSTEM: ส่วนแสดงผลและจัดการรูปภาพ */}
            <div className="space-y-4 pt-4 border-t dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-500" /> รูปเครื่อง / สภาพเครื่อง <span className="text-xs font-normal text-slate-400">({job?.images?.length || 0}/4)</span>
                </h4>
                <Input type="file" id="detail-image-upload" accept="image/*" multiple className="hidden" onChange={handleDirectUpload} disabled={isUploading || (job?.images?.length || 0) >= 4} />
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-slate-300 dark:border-slate-700" disabled={isUploading || (job?.images?.length || 0) >= 4} onClick={() => document.getElementById("detail-image-upload")?.click()}>
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Plus className="w-3 h-3 mr-1" />} แนบรูปเพิ่ม
                </Button>
              </div>

              {job?.images && job.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {job.images.map((url: string, idx: number) => (
                    // 🌟 เพิ่ม group สำหรับ Hover Effect
                    <div 
                      key={idx} 
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm group bg-slate-100 dark:bg-slate-900 cursor-pointer"
                      onClick={() => setExpandedImage(url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="img" loading="lazy" className="object-cover w-full h-full hover:scale-105 transition-transform" />
                      
                      {/* 🌟 แสดงวันที่แบบ Overlay เมื่อ Hover */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 px-1 text-[10px] text-white text-center translate-y-full group-hover:translate-y-0 transition-transform duration-200 pointer-events-none">
                        {extractUploadDateFromUrl(url)}
                      </div>

                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(url); }} // 🌟 ดัก Event ด้วย stopPropagation 
                        disabled={isUploading}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-rose-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  ยังไม่มีรูปภาพประกอบ
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3 sm:justify-end sm:space-x-3 border-t dark:border-slate-800 pt-4 mt-2">
            <Button variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300" onClick={() => onOpenChange(false)} disabled={isSaving || isUploading}>ปิดหน้าต่าง</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={isSaving || isUploading}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              บันทึกข้อมูล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🌟 QUEUE IMAGE SYSTEM: Full-Screen Image Viewer สำหรับ Detail Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={(open) => !open && setExpandedImage(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] bg-black/95 border-slate-800 p-0 overflow-hidden flex flex-col z-[100]">
          <div className="p-3 flex items-center justify-between border-b border-white/10 shrink-0">
            <span className="text-white/90 text-sm font-medium pl-2">
              <CalendarClock className="w-4 h-4 inline-block mr-2 text-emerald-400" />
              อัปโหลดเมื่อ: {expandedImage ? extractUploadDateFromUrl(expandedImage) : ''}
            </span>
            <button onClick={() => setExpandedImage(null)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-2 custom-scrollbar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={expandedImage || ""} alt="expanded" className="max-w-none max-h-full object-contain rounded-md" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}