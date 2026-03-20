"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { UploadCloud, Save, Store, Loader2, Info } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getShopSettings, updateShopSettings } from "@/actions/shop"

// 🌟 รับ shopId ผ่าน Props เพื่อเตรียมรองรับระบบ Login แบบ Multi-tenant
export function ShopSettings({ shopId = "shop_test_001" }: { shopId?: string }) {
  const [shopName, setShopName] = useState("กำลังโหลด...")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  
  // 🌟 เก็บไฟล์ Blob ที่ผ่านการบีบอัดแล้ว เพื่อส่งให้ Backend
  const [logoFile, setLogoFile] = useState<Blob | null>(null) 
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true)
      const res = await getShopSettings(shopId)
      if (res.success && res.data) {
        setShopName(res.data.name || "ยังไม่ได้ตั้งชื่อร้าน")
        if (res.data.logoUrl) setLogoPreview(res.data.logoUrl)
      } else {
        setShopName("ร้านปิ๊กโมบาย")
      }
      setIsLoading(false)
    }
    loadSettings()
  }, [shopId])

  const processImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX_SIZE = 200
        const size = Math.min(img.width, img.height)
        const startX = (img.width - size) / 2
        const startY = (img.height - size) / 2

        canvas.width = MAX_SIZE
        canvas.height = MAX_SIZE
        const ctx = canvas.getContext("2d")
        
        if (ctx) {
          ctx.fillStyle = "rgba(255, 255, 255, 0)"
          ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE)
          ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_SIZE, MAX_SIZE)
          
          // 🌟 เปลี่ยนจาก Base64 เป็นการสร้าง Blob (ก้อนไฟล์) เพื่อเตรียมอัปโหลด!
          canvas.toBlob((blob) => {
            if (blob) {
              setLogoFile(blob) // เก็บไฟล์เตรียมส่ง
              setLogoPreview(URL.createObjectURL(blob)) // สร้าง URL ชั่วคราวเพื่อ Preview หน้าจอ
            }
          }, "image/webp", 0.8)
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
        toast({ title: "ไฟล์ไม่รองรับ", description: "กรุณาอัปโหลดไฟล์รูปภาพ", variant: "destructive" })
        return
      }
      processImage(file)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    // 🌟 ใช้ FormData เพื่อแพ็กไฟล์รูปและ Text ส่งไปพร้อมกัน
    const formData = new FormData()
    formData.append("shopId", shopId)
    formData.append("name", shopName)
    
    if (logoFile) {
      // แนบไฟล์โลโก้ใหม่ไป
      formData.append("logo", logoFile, "logo.webp")
    } else if (logoPreview) {
      // ถ้าไม่ได้แก้รูป ส่ง URL เดิมไปเฉยๆ
      formData.append("existingLogoUrl", logoPreview)
    }
    
    const res = await updateShopSettings(formData)

    if (res.success) {
      toast({ title: "✅ บันทึกข้อมูลสำเร็จ", description: "อัปเดตข้อมูลร้านค้าเรียบร้อยแล้ว" })
    } else {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: res.error, variant: "destructive" })
    }
    
    setIsSaving(false)
  }

  const getInitial = (name: string) => {
    return name && name !== "กำลังโหลด..." ? name.charAt(0).toUpperCase() : "S"
  }

  // โค้ดส่วน UI ด้านล่างเหมือนเดิมเลยครับ แค่เปลี่ยนชื่อตัวแปรนิดหน่อย
  return (
    <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto py-6">
      {/* ส่วนตั้งค่าฝั่งซ้าย */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ตั้งค่าร้านค้า (Shop Settings)</h2>
          <p className="text-sm text-slate-500">ปรับแต่งชื่อและโลโก้เพื่อแสดงผลบนฟอร์มของลูกค้า</p>
        </div>

        <Card className="border-slate-200 shadow-sm relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
          )}
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="shopName" className="font-semibold text-slate-700">ชื่อร้านค้า (Display Name)</Label>
              <Input 
                id="shopName" 
                value={shopName} 
                onChange={(e) => setShopName(e.target.value)} 
                placeholder="เช่น ร้าน A Mobile Repair" 
                className="text-lg h-12 focus-visible:ring-emerald-500"
                disabled={isLoading}
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
                    <AvatarImage src={logoPreview} alt="Shop Logo" className="object-cover bg-white" />
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
                    disabled={isLoading}
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
            <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-base">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* พรีวิวฝั่งขวา */}
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
              <Avatar className="h-14 w-14 border-2 border-white shadow-md mb-2 bg-white">
                {logoPreview ? (
                  <AvatarImage src={logoPreview} alt="Preview Logo" className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                    {getInitial(shopName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <h3 className="font-bold text-slate-800 text-base truncate w-full px-2">{shopName && shopName !== "กำลังโหลด..." ? shopName : "ชื่อร้านของคุณ"}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">ฟอร์มแจ้งซ่อมออนไลน์</p>
            </div>
            
            {/* โครงฟอร์มจำลอง */}
            <div className="p-4 space-y-4 bg-white mx-3 mt-3 rounded-xl shadow-sm border border-slate-50">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-slate-200 rounded"></div>
                <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                <div className="flex gap-1.5 pt-1">
                  <div className="h-6 w-14 bg-emerald-100 rounded-full"></div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                  <div className="h-6 w-12 bg-slate-100 rounded-full"></div>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                  <div className="h-8 w-full bg-slate-50 border border-slate-100 rounded-md"></div>
                </div>
                <div className="h-16 w-full bg-slate-50 border border-slate-100 rounded-md mt-2"></div>
              </div>
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