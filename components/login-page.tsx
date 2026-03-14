// components/login-page.tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Mail } from "lucide-react" // ไอคอนอีเมล
// ถ้าอยากได้ไอคอน Google สวยๆ อาจจะต้องใช้ library อย่าง react-icons หรือใช้ SVG วาดเอาครับ

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">เข้าสู่ระบบ (สำหรับร้านค้า)</CardTitle>
          <CardDescription>
            จัดการคิวซ่อมมือถือของร้านคุณได้ง่ายๆ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ส่วนที่ 1: Magic Link (ของเดิม) */}
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" type="email" placeholder="name@example.com" />
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Mail className="mr-2 h-4 w-4" />
              ส่งลิงก์เข้าสู่ระบบ (Magic Link)
            </Button>
          </div>

          {/* เส้นคั่นกลาง */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                หรือ
              </span>
            </div>
          </div>

          {/* ส่วนที่ 2: ปุ่ม Google Login (เพิ่มใหม่) */}
          <Button variant="outline" className="w-full">
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
            เข้าสู่ระบบด้วย Google
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}