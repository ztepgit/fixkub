"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, Loader2 } from "lucide-react" 
import { supabase } from "@/lib/supabase" // 🌟 เรียกใช้ Supabase ฝั่ง Client

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { toast } = useToast()

  // 🌟 ดักจับ Error ที่ส่งกลับมาจาก URL ทั้งหมด
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (error) {
        setTimeout(() => {
          toast({ 
            title: "❌ เข้าสู่ระบบไม่สำเร็จ", 
            description: errorDescription 
              ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) 
              : "ลิงก์อาจหมดอายุ หรือเกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", 
            variant: "destructive" 
          });
        }, 100);
        
        // ล้าง URL ให้สะอาด (เอา ?error=... ออก)
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [toast]);

  // 🌟 ฟังก์ชัน: ล็อกอินด้วย Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({ title: "กรุณากรอกอีเมล", variant: "destructive" })
      return
    }

    setIsMagicLinkLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // เมื่อกดลิงก์ในอีเมล ให้วิ่งไปที่หน้า Callback ของเรา
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "✅ ส่งอีเมลสำเร็จ", description: "กรุณาตรวจสอบกล่องจดหมายของคุณเพื่อเข้าสู่ระบบ" })
      setEmail("") // เคลียร์ช่องกรอก
    }
    setIsMagicLinkLoading(false)
  }

  // 🌟 ฟังก์ชัน: ล็อกอินด้วย Google
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // ล็อกอินเสร็จ ให้วิ่งไปที่หน้า Callback ของเรา
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
      setIsGoogleLoading(false)
    }
    // หมายเหตุ: ถ้าสำเร็จ หน้าเว็บจะ Redirect ไปที่ Google ทันที เลยไม่ต้อง set isGoogleLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200/60">
        <CardHeader className="space-y-1 text-center pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">เข้าสู่ระบบ (สำหรับร้านค้า)</CardTitle>
          <CardDescription className="text-slate-500">
            จัดการคิวซ่อมมือถือของร้านคุณได้ง่ายๆ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* ส่วนที่ 1: Magic Link */}
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600">อีเมล</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                disabled={isMagicLinkLoading || isGoogleLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              disabled={isMagicLinkLoading || isGoogleLoading}
            >
              {isMagicLinkLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              ส่งลิงก์เข้าสู่ระบบ (Magic Link)
            </Button>
          </form>

          {/* เส้นคั่นกลาง */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">
                หรือ
              </span>
            </div>
          </div>

          {/* ส่วนที่ 2: ปุ่ม Google Login */}
          <Button 
            type="button"
            variant="outline" 
            className="w-full h-11 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            onClick={handleGoogleLogin}
            disabled={isMagicLinkLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
            )}
            เข้าสู่ระบบด้วย Google
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}