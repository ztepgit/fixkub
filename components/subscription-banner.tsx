import { AlertTriangle, Clock, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// สมมติว่ารับค่า trialEndsAt มาจาก Database (ผ่าน Props)
export function SubscriptionBanner({ trialEndsAt }: { trialEndsAt: Date | string }) {
  // คำนวณวันคงเหลือ
  const today = new Date();
  const endDate = new Date(trialEndsAt);
  const diffTime = endDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // ปัดเศษขึ้นเป็นจำนวนวัน

  // ถ้าเหลือมากกว่า 7 วัน = ไม่ต้องโชว์ Banner อะไรเลย (ให้เฮียใช้สบายใจ)
  if (daysRemaining > 7) return null;

  // 💎 แยกส่วนแสดงราคาออกมาเป็น Component ย่อย เพื่อให้ UI ดูคลีนและเน้นตัวเลขให้เด่นขึ้น
  const PricingBlock = () => (
    <div className="flex flex-col space-y-1 my-3 bg-white/60 p-3 rounded-md border border-black/5 w-fit">
      <span className="text-sm font-medium text-slate-700">199 / เดือน</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-emerald-700">⭐ 1,690 / ปี</span>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
          ประหยัด 698 บาท
        </span>
      </div>
    </div>
  );

  // ถ้าหมดอายุแล้ว (0 หรือติดลบ) = โชว์แบนเนอร์สีแดง ล็อคระบบ
  if (daysRemaining <= 0) {
    return (
      <Alert variant="destructive" className="mb-6 border-red-500 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-bold">ระบบทดลองใช้งานหมดอายุแล้ว!</AlertTitle>
        <AlertDescription className="mt-2">
          <p>กรุณาอัปเกรดแพ็กเกจ เพื่อเปิดระบบรับคิวซ่อมต่อ</p>

          <PricingBlock />

          <Button variant="destructive" size="sm" className="mt-1">
            อัปเกรดเดี๋ยวนี้
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // --- กำหนดข้อความและสีตามจำนวนวันที่เหลือ (7, 3, 1) ---
  let bannerStyle = "border-yellow-400 bg-yellow-50 text-yellow-800"; // Default: สีเหลือง (7 วัน)
  let icon = <Clock className="h-4 w-4 text-yellow-600" />;

  if (daysRemaining <= 3 && daysRemaining > 1) {
    bannerStyle = "border-orange-400 bg-orange-50 text-orange-800"; // 3 วัน: สีส้มเตือนแรงขึ้น
    icon = <AlertTriangle className="h-4 w-4 text-orange-600" />;
  } else if (daysRemaining === 1) {
    bannerStyle = "border-red-400 bg-red-50 text-red-800 animate-pulse"; // 1 วัน: สีแดงและกระพริบเบาๆ
    icon = <AlertCircle className="h-4 w-4 text-red-600" />;
  }

  return (
    <Alert className={`mb-6 ${bannerStyle}`}>
      {icon}
      <AlertTitle className="font-bold">
        {daysRemaining === 1 ? "เตือนครั้งสุดท้าย!" : "แจ้งเตือนระบบทดลองใช้งาน"}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p>ระบบทดลองฟรีของคุณจะหมดอายุในอีก <strong>{daysRemaining} วัน</strong></p>

        <PricingBlock />

        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white mt-1" size="sm">
          อัปเกรดเดี๋ยวนี้
        </Button>
      </AlertDescription>
    </Alert>
  );
}