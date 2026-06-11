// components/dashboard-header.tsx
"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

import { QrCode, Copy, Download, Link as LinkIcon, Eye, EyeOff, Loader2, Home, LogOut } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { getUserShops } from "@/actions/shop"
import { ThemeToggle } from "@/components/theme-toggle"

const QRCodeCanvas = dynamic(
  () => import("qrcode.react").then((mod) => mod.QRCodeCanvas),
  { ssr: false }
)

interface DashboardHeaderProps {
  currentTabName?: string;
}

export function DashboardHeader({ currentTabName = "ภาพรวม" }: DashboardHeaderProps) {
  const router = useRouter()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isQrHidden, setIsQrHidden] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const qrWrapperRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const { data: shop, isLoading } = useQuery({
    queryKey: ["current-shop"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error("Unauthorized")
      
      const res = await getUserShops(user.email)
      if (!res.success || !res.shops || res.shops.length === 0) {
        throw new Error("Shop not found")
      }
      return res.shops[0]
    },
    staleTime: 1000 * 60 * 5,
  })

  const shopUrl = shop?.slug ? `https://${shop.slug}.getfixx.net` : ""

  const copyLink = () => {
    if (!shopUrl) return
    navigator.clipboard.writeText(shopUrl)
    toast({ 
      title: "✅ คัดลอกลิงก์สำเร็จ", 
      description: "นำไปวางในเพจ Facebook, LINE หรือส่งให้ลูกค้าได้เลย" 
    })
  }

  const downloadQR = () => {
    if (!qrWrapperRef.current) return;
    const canvas = qrWrapperRef.current.querySelector('canvas');
    
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      
      const currentSlug = shop?.slug || "getfixx";
      link.download = `QR-Code-${currentSlug}.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "📥 ดาวน์โหลดสำเร็จ", description: "รูป QR Code ถูกบันทึกลงในเครื่องแล้ว" })
    }
  }

  // 🌟 ฟังก์ชันกลับหน้าแรก (แบบไม่ให้โดนเตะกลับ)
  const handleGoHome = (e: React.MouseEvent) => {
    e.preventDefault()
    // ตั้งค่า flag เพื่อบอกหน้า Landing Page ว่า "ไม่ต้องเตะฉันกลับมา Dashboard อีกนะ"
    sessionStorage.setItem("hasAutoRouted", "true")
    router.push("/")
  }

  // 🌟 ฟังก์ชันออกจากระบบแบบล้างค่าสะอาด
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      sessionStorage.removeItem("hasAutoRouted") // ล้าง flag การเตะออโต้
      window.location.href = "/" // ใช้ window.location.href เพื่อล้าง State ทั้งหมดในเครื่อง
    } catch (error) {
      console.error("Logout Error:", error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="flex w-full h-16 md:h-20 shrink-0 items-center justify-between border-b px-4 md:px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      
      <div className="flex items-center gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            
            <BreadcrumbItem className="hidden md:block">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* 🌟 ผูกปุ่ม Home เข้ากับ handleGoHome */}
                    <a href="/" onClick={handleGoHome} className="flex items-center text-slate-400 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors p-1">
                      <Home className="h-4 w-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    กลับหน้าหลัก
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block text-slate-300 dark:text-slate-600" />

            <BreadcrumbItem className="hidden md:block">
              <span className="text-slate-500 dark:text-slate-300 font-normal cursor-default">
                ระบบจัดการคิว
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block text-slate-300 dark:text-slate-600" />
            
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-slate-800 dark:text-slate-100">{currentTabName}</BreadcrumbPage>
            </BreadcrumbItem>

          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />

        <TooltipProvider>
          <Button 
            variant="outline" 
            className="hidden sm:flex bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 shadow-sm transition-all h-10 px-4 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:hover:text-blue-300"
            onClick={() => setIsShareOpen(true)}
          >
            <QrCode className="w-4 h-4 mr-2" /> แชร์ลิงก์ร้าน
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="sm:hidden bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-sm h-10 w-10 dark:bg-blue-950/50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/50"
            onClick={() => setIsShareOpen(true)}
          >
            <QrCode className="w-5 h-5" />
          </Button>
        </TooltipProvider>

        {/* 🌟 เพิ่มปุ่ม Logout เป็น "ทางออกฉุกเฉิน" */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 ml-2"
          title="ออกจากระบบ"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="hidden lg:inline ml-2">ออกจากระบบ</span>
        </Button>

        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent 
            className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl dark:bg-slate-900"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            
            <DialogHeader className={`p-6 pb-4 border-b ${isQrHidden ? 'bg-slate-50/50 dark:bg-slate-900/50' : 'bg-blue-50/50 dark:bg-blue-950/50'} dark:border-slate-800`}>
              <div className="flex items-start justify-between pr-4">
                <div className="space-y-1">
                  <DialogTitle className={`text-xl flex items-center gap-2 ${isQrHidden ? 'text-slate-600 dark:text-slate-300' : 'text-blue-800 dark:text-blue-400'}`}>
                    <QrCode className={`h-5 w-5 ${isQrHidden ? 'text-slate-400 dark:text-slate-400' : 'text-blue-600 dark:text-blue-500'}`} />
                    {isQrHidden ? 'ซ่อนรหัส QR แล้ว' : 'แชร์ให้ลูกค้าสแกน'}
                  </DialogTitle>
                  <DialogDescription className={isQrHidden ? 'text-slate-400 dark:text-slate-400' : 'text-blue-600/70 dark:text-blue-400/70'}>
                    แจ้งซ่อมออนไลน์
                  </DialogDescription>
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-8 w-8 rounded-full -mt-1 ${isQrHidden ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200' : 'text-slate-400 hover:text-blue-600 hover:bg-white/60 dark:text-blue-400/50 dark:hover:bg-slate-800 dark:hover:text-blue-300'}`} 
                        onClick={() => setIsQrHidden(!isQrHidden)}
                      >
                        {isQrHidden ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isQrHidden ? "แสดง QR Code" : "ซ่อน QR Code"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DialogHeader>

            <div className="p-6 pt-4 bg-white dark:bg-slate-900 space-y-6">
              <div className="flex justify-center">
                {isQrHidden ? (
                  <div className="flex flex-col items-center justify-center space-y-3 h-[200px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 animate-in fade-in duration-300">
                    <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm mb-1">
                      <QrCode className="h-6 w-6 text-slate-300 dark:text-slate-500 opacity-60" />
                    </div>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border dark:border-slate-700 shadow-sm">ภาพ QR Code ถูกซ่อนไว้</p>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 transition-transform hover:scale-105 duration-300 animate-in fade-in duration-300 zoom-in-95">
                    {isLoading ? (
                      <div className="w-[160px] h-[160px] bg-slate-50 animate-pulse rounded-xl flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                      </div>
                    ) : shopUrl ? (
                      <div ref={qrWrapperRef}>
                        <QRCodeCanvas
                          value={shopUrl}
                          size={160}
                          bgColor={"#ffffff"}
                          fgColor={"#0f172a"}
                          level={"H"}
                          includeMargin={false}
                        />
                      </div>
                    ) : (
                      <div className="w-[160px] h-[160px] bg-slate-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-center p-2">
                        <p className="text-xs text-slate-400">ยังไม่มี URL ร้าน<br/>(กรุณาตั้งชื่อ URL)</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase tracking-wider">
                    ลิงก์ร้านค้าของคุณ (URL)
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      readOnly 
                      value={isLoading ? "กำลังโหลด..." : (shopUrl || "ยังไม่มี URL ร้านค้า")} 
                      className={`bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 focus-visible:ring-0 cursor-copy h-10 ${!shopUrl && !isLoading ? 'text-rose-400 italic' : ''}`} 
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button variant="outline" size="icon" onClick={copyLink} disabled={!shopUrl} className="h-10 w-10 shrink-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-blue-400">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" className="w-full text-slate-700 border-slate-300 hover:bg-slate-50 h-11 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" onClick={copyLink} disabled={!shopUrl}>
                    <LinkIcon className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" /> คัดลอกลิงก์
                  </Button>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-11" 
                    onClick={downloadQR}
                    disabled={isQrHidden || !shopUrl} 
                  >
                    <Download className="h-4 w-4 mr-2" /> โหลดรูปภาพ
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

    </header>
  )
}