// app/privacy-policy/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "ติดต่อเรา | Getfixx",
    description: "ข้อมูลการติดต่อและช่องทางการสื่อสารกับทีมงานของเว็บไซต์ Getfixx.net",
};

export default function ContactUsPage() {
    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* ปุ่มกลับไปหน้าหลัก (ด้านบน) */}
                <Link
                    href="/"
                    className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    กลับหน้าหลัก
                </Link>

                {/* ส่วนหัว */}
                <div className="space-y-2 border-b border-border pb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                        ติดต่อเรา
                    </h1>
                    <p className="text-muted-foreground">
                        ปรับปรุงล่าสุด: 20 มิถุนายน 2569
                    </p>
                </div>

                {/* เนื้อหานโยบาย */}
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/80 space-y-6">
                    <p>
                        ขอบคุณที่เลือกใช้บริการ Getfixx (ระบบจัดการคิวซ่อมมือถือ) หากคุณมีข้อสงสัย ข้อเสนอแนะ หรือปัญหาเกี่ยวกับการใช้งาน เรายินดีที่จะช่วยเหลือและให้คำปรึกษา </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">ติดต่อเรา</h2>

                        <ul className="list-disc pl-6 space-y-1">
                            <li>ติดต่อเราผ่านทางอีเมล: support@getfixx.net</li>
                            <li>ติดต่อเราผ่านทางโทรศัพท์: +66 641897530</li>

                        </ul>
                    </section>
                </div>

                {/* ปุ่มกลับไปหน้าหลัก (ด้านล่าง) */}
                <div className="pt-8 border-t border-border flex justify-center sm:justify-start">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        กลับหน้าหลัก
                    </Link>
                </div>

            </div>
        </div>
    );
}