// app/privacy-policy/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "นโยบายการคืนเงิน | Fixkub",
    description: "นโยบายการคืนเงิน (Refund Policy) ของเว็บไซต์ Fixkub.net",
};

export default function RefundPolicyPage() {
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
                        นโยบายการคืนเงิน (Refund Policy)
                    </h1>
                    <p className="text-muted-foreground">
                        ปรับปรุงล่าสุด: 20 มิถุนายน 2569
                    </p>
                </div>

                {/* เนื้อหานโยบาย */}
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/80 space-y-6">
                    <p>
                        ขอขอบคุณที่เลือกใช้บริการ Fixkub (ระบบจัดการคิวซ่อมมือถือ) นโยบายการคืนเงินฉบับนี้จัดทำขึ้นเพื่อกำหนดเงื่อนไขและข้อตกลงในการขอคืนเงินสำหรับการซื้อแพ็กเกจหรือสิทธิ์การใช้งานล่วงหน้าบนระบบของเรา
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. นโยบายการไม่คืนเงิน (General No-Refund Policy)</h2>
                        <p>
                            เนื่องจากบริการของเราเป็นรูปแบบการชำระเงินล่วงหน้าเพื่อแลกรับสิทธิ์การใช้งาน (Prepaid / Pay-per-use) การทำรายการสั่งซื้อและชำระเงินที่เสร็จสมบูรณ์แล้ว ถือเป็นที่สิ้นสุด (All sales are final) ทางเราขอสงวนสิทธิ์ในการไม่คืนเงินในทุกกรณี หากท่านได้ทำการซื้อแพ็กเกจหรือเครดิตการใช้งานไปแล้ว ไม่ว่าท่านจะเปิดใช้งานสิทธิ์นั้นแล้วหรือไม่ก็ตาม
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. ข้อยกเว้นที่สามารถพิจารณาคืนเงินหรือชดเชยได้</h2>
                        <p>ทางเราจะพิจารณาการคืนเงิน หรือชดเชยเป็นสิทธิ์การใช้งาน (เครดิต) ให้กับท่าน เฉพาะในกรณีดังต่อไปนี้:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>การชำระเงินซ้ำซ้อน (Duplicate Payment):</strong> เกิดข้อผิดพลาดในระบบรับชำระเงินที่ทำให้ท่านถูกหักเงินซ้ำซ้อนจากรายการสั่งซื้อเดียวกัน</li>
                            <li><strong>ระบบขัดข้องร้ายแรง (Major Technical Issues):</strong> ระบบ Fixkub ไม่สามารถให้บริการได้ตามปกติ หรือเกิดข้อผิดพลาดทางเทคนิคจากฝั่งเซิร์ฟเวอร์ของเราเป็นระยะเวลานาน จนทำให้ท่านไม่สามารถใช้งานสิทธิ์ที่ซื้อไว้ได้ตามสมควร</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. กรณีที่ไม่สามารถขอคืนเงินได้</h2>
                        <p>เพื่อให้เกิดความชัดเจน ทางเราจะไม่รับพิจารณาการคืนเงินในกรณีต่อไปนี้:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>ท่านเปลี่ยนใจหลังจากการชำระเงินสำเร็จแล้ว</li>
                            <li>ท่านสั่งซื้อแพ็กเกจผิดพลาดด้วยตัวท่านเอง</li>
                            <li>สิทธิ์การใช้งานหรือเครดิตหมดอายุ (ตามเงื่อนไขอายุการใช้งานที่ระบุไว้ตอนสั่งซื้อ)</li>
                            <li>บัญชีผู้ใช้งานของท่านถูกระงับหรือยกเลิก เนื่องจากพบการกระทำที่ละเมิด ข้อตกลงการให้บริการ (Terms of Service) ของเรา</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">4. ขั้นตอนการแจ้งปัญหาและขอพิจารณาคืนเงิน</h2>
                        <p>หากท่านพบปัญหาที่เข้าข่ายเงื่อนไขในข้อ 2 ท่านสามารถติดต่อทีมงานเพื่อขอรับการพิจารณาได้ตามขั้นตอนดังนี้:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>ติดต่อเราผ่านทางอีเมล: support@fixkub.net</li>
                            <li>ติดต่อเราผ่านทางโทรศัพท์: +66 641897530</li>
                            <li>โปรดแจ้งเรื่องภายใน 7 วัน นับจากวันที่เกิดปัญหาหรือวันที่ทำรายการ</li>
                            <li>แนบหลักฐานการชำระเงิน (สลิป หรือ ใบเสร็จ) และคำอธิบายปัญหาที่พบอย่างละเอียด</li>
                            <li>ทีมงานจะใช้เวลาตรวจสอบและแจ้งผลการพิจารณาให้ท่านทราบภายใน 3-5 วันทำการ</li>
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