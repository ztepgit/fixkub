import { Card, CardContent } from "@/components/ui/card"

export function HowToTry() {
  const steps = [
    {
      num: "1",
      title: 'กดปุ่ม "เล่นร้านตัวอย่าง"',
      desc: "ในร้านตัวอย่าง กดเล่นได้ทุกเมนู",
    },
    {
      num: "2",
      title: "สร้างคิวซ่อม",
      desc: 'สแกน QR Code, หรือกดปุ่ม "สร้างใบสั่งซ่อม" ในเมนูกระดานคิว คิวจะวิ่งเข้าบอร์ดทันที',
    },
    {
      num: "3",
      title: "เปิดใช้งานจริง",
      desc: 'เมื่อเล่นจนพอใจแล้ว กดปุ่ม "เปิดใช้งาน" ระบบจะนำทางไปชำระเงิน พร้อมแถมวันใช้งานฟรี 30 วัน หากไม่ต้องการใช้งาน แค่กดปิดหน้าต่าง',
    },
  ]

  return (
    <section className="py-16 bg-white relative z-10">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl font-bold text-slate-900 md:text-4xl text-center mb-12">
          ลองง่ายๆ ไม่เสียเงิน
        </h2>
        
        {/* ใช้ grid-cols-1 สำหรับมือถือ (แนวตั้ง) และ md:grid-cols-3 สำหรับจอใหญ่ (แนวนอน) */}
        <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto">
          {steps.map((step, idx) => (
            <Card key={idx} className="border border-slate-400 shadow-md shadow-slate-200/50 hover:shadow-lg transition-shadow bg-white">
              <CardContent className="p-8 text-center flex flex-col items-center">
                {/* 1. ตัวเลขหนา สีเทา ไม่มีข้อความอื่นในบรรทัดนี้ */}
                <div className="text-8xl font-black text-slate-600 mb-6 leading-none">
                  {step.num}
                </div>
                
                {/* 2. ข้อความ paragraph ถัดไป สีดำ */}
                <p className="text-xl font-bold text-slate-800 mb-3">
                  {step.title}
                </p>
                
                {/* 3. คำ tagline สีเทา */}
                <p className="text-md text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}