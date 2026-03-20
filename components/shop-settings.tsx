"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { UploadCloud, Save, Store, Loader2, Info } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ShopSettings() {
  const [shopName, setShopName] = useState("ร้านปิ๊กโมบาย")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const processImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX_SIZE = 200
        let width = img.width
        let height = img.height
        const size = Math.min(width, height)
        const startX = (width - size) / 2
        const startY = (height - size) / 2

        canvas.width = MAX_SIZE
        canvas.height = MAX_SIZE
        const ctx = canvas.getContext("2d")
        
        if (ctx) {
          ctx.fillStyle = "rgba(255, 255, 255, 0)"
          ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE)
          ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_SIZE, MAX_SIZE)
          const compressedDataUrl = canvas.toDataURL("image/webp", 0.8)
          setLogoPreview(compressedDataUrl)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.type.startsWith("image/")) {
        toast({ title: "ไฟล์ไม่รองรับ", description: "กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น", variant: "destructive" })
        return
      }
      processImage(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({ title: "บันทึกข้อมูลสำเร็จ", description: "อัปเดตข้อมูลร้านค้าของคุณแล้ว" })
    }, 1000)
  }

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "S"
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ตั้งค่าร้านค้า (Shop Settings)</h2>
          <p className="text-sm text-slate-500">ปรับแต่งชื่อและโลโก้เพื่อแสดงผลบนฟอร์มของลูกค้า</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="shopName" className="font-semibold text-slate-700">ชื่อร้านค้า (Display Name)</Label>
              <Input 
                id="shopName" 
                value={shopName} 
                onChange={(e) => setShopName(e.target.value)} 
                placeholder="เช่น ร้าน A Mobile Repair" 
                className="text-lg h-12 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-700">โลโก้ร้าน (Shop Logo)</Label>
                <span className="text-xs text-slate-500 bg-emerald-50 text-emerald-700 px-2 py-1 rounded flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  เพิ่มความน่าเชื่อถือ
                </span>
              </div>
              
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-slate-100 shadow-sm">
                  {logoPreview ? (
                    <AvatarImage src={logoPreview} alt="Shop Logo" className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-3xl font-bold">
                      {getInitial(shopName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="space-y-2 flex-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 border-slate-300 border-dashed hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <UploadCloud className="h-4 w-4" /> อัปโหลดรูปภาพ
                  </Button>
                  <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <p className="text-xs text-slate-400">ระบบจะทำการย่อรูปให้อัตโนมัติเพื่อความรวดเร็ว</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t py-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-base">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-center md:justify-start">
          <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center">
            <Store className="h-4 w-4 mr-2" />
            ตัวอย่างหน้าจอฝั่งลูกค้า
          </Label>
        </div>
        
        <div className="mx-auto md:ml-0 w-full max-w-[340px] bg-slate-100 border-[8px] border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative min-h-[500px] flex flex-col pointer-events-none select-none">
          <div className="absolute top-0 inset-x-0 h-5 bg-slate-800 w-32 mx-auto rounded-b-xl z-20"></div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-slate-100/50">
            
            <div className="bg-white px-5 pt-10 pb-4 rounded-t-[2rem] border-b border-slate-100 shadow-sm flex flex-col items-center text-center relative z-10">
              <Avatar className="h-14 w-14 border-2 border-white shadow-md mb-2">
                {logoPreview ? (
                  <AvatarImage src={logoPreview} alt="Preview Logo" className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                    {getInitial(shopName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <h3 className="font-bold text-slate-800 text-base truncate w-full px-2">{shopName || "ชื่อร้านของคุณ"}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">ฟอร์มแจ้งซ่อมออนไลน์</p>
            </div>

            <div className="p-4 space-y-4 bg-white mx-3 mt-3 rounded-xl shadow-sm border border-slate-50">
              {/* 1. บริการ */}
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-200 rounded"></div>
                <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                <div className="flex gap-1.5 pt-1">
                  <div className="h-6 w-14 bg-emerald-100 rounded-full"></div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                  <div className="h-6 w-12 bg-slate-100 rounded-full"></div>
                </div>
              </div>
              
              {/* 2. ข้อมูลเครื่อง */}
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                  <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                </div>
                <div className="h-16 w-full bg-slate-50 border border-slate-100 rounded-md mt-2"></div>
              </div>

              {/* 3. ปุ่มกด */}
              <div className="pt-2 border-t border-slate-50">
                <div className="h-10 w-full bg-emerald-500 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}