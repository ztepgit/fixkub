// components/login-page.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { toast } = useToast()

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

        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [toast]);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({ title: "กรุณากรอกอีเมล", variant: "destructive" })
      return
    }
    // 🌟 เพิ่มการดักจับเครื่องหมาย + ตรงนี้
    if (email.includes('+')) {
      toast({
        title: "ไม่อนุญาตให้ใช้อีเมลที่มีเครื่องหมาย + เข้าสู่ระบบครับ",
        description: "ระบบไม่อนุญาตให้ใช้อีเมลที่มีเครื่องหมาย + (Alias) ในการเข้าสู่ระบบครับ",
        variant: "destructive"
      })
      return
    }

    setIsMagicLinkLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "✅ ส่งอีเมลสำเร็จ", description: "กรุณาตรวจสอบกล่องจดหมายของคุณเพื่อเข้าสู่ระบบ" })
      setEmail("")
    }
    setIsMagicLinkLoading(false)
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    })

    if (error) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: error.message, variant: "destructive" })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200/60 overflow-hidden">
        {/* แถบสีด้านบนเพื่อความสวยงาม (Optional) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500"></div>

        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-800">ยินดีต้อนรับ</CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            จัดการร้านมือถือของคุณอย่างมืออาชีพ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 sm:px-8 pb-8">

          {/* 🌟 ส่วนที่ 1: ปุ่ม Google Login (เน้นให้เด่นที่สุด) */}
          <Button
            type="button"
            className="w-full h-12 text-white text-base font-medium shadow-md transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: '#4285F4' }} // สีน้ำเงิน Google
            onClick={handleGoogleLogin}
            disabled={isMagicLinkLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            ) : (
              <div className="bg-white p-1 rounded-sm mr-3 flex items-center justify-center">
                {/* Google "G" Logo แบบที่มีสีสัน */}
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
            )}
            ดำเนินการต่อด้วย Google
          </Button>

          {/* เส้นคั่นกลาง */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium">
                หรือใช้อีเมล
              </span>
            </div>
          </div>

          {/* 🌟 ส่วนที่ 2: Magic Link (ลดความเด่นลง) */}
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600 font-medium">ระบุอีเมลของคุณ</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-slate-300"
                disabled={isMagicLinkLoading || isGoogleLoading}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full h-12 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm font-medium"
              disabled={isMagicLinkLoading || isGoogleLoading}
            >
              {isMagicLinkLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <Mail className="mr-2 h-4 w-4 text-slate-500" />
              )}
              เข้าสู่ระบบผ่านลิงก์อีเมล
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}