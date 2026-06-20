// app/privacy-policy/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "นโยบายความเป็นส่วนตัว | Getfixx",
    description: "นโยบายความเป็นส่วนตัว (Privacy Policy) ของเว็บไซต์ Getfixx.net",
};

export default function PrivacyPolicyPage() {
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
                        นโยบายความเป็นส่วนตัว (Privacy Policy)
                    </h1>
                    <p className="text-muted-foreground">
                        ปรับปรุงล่าสุด: 25 พฤษภาคม 2569
                    </p>
                </div>

                {/* เนื้อหานโยบาย */}
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/80 space-y-6">
                    <p>
                        เว็บไซต์ Getfixx (ต่อไปนี้เรียกว่า "เรา") เคารพในความเป็นส่วนตัวของผู้ใช้งาน เพื่อให้คุณมั่นใจในการใช้บริการของเรา นโยบายความเป็นส่วนตัวฉบับนี้จะอธิบายถึงวิธีการที่เราจัดเก็บ รวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณ
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. ข้อมูลที่เราเก็บรวบรวม</h2>
                        <p>เนื่องจากระบบของเราถูกออกแบบมาให้เก็บข้อมูลเท่าที่จำเป็นที่สุดเพื่อให้บริการ เราจึงเก็บรวบรวมข้อมูลส่วนบุคคลของคุณเฉพาะเมื่อคุณสมัครสมาชิกหรือเข้าสู่ระบบ ดังนี้:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>ที่อยู่อีเมล (Email Address):</strong> ได้รับเมื่อคุณเข้าสู่ระบบผ่านลิงก์อีเมล (Magic Link) หรือผ่านบัญชี Google</li>
                            <li><strong>ข้อมูลโปรไฟล์สาธารณะ (Public Profile):</strong> หากคุณเข้าสู่ระบบด้วย Google เราอาจได้รับข้อมูลเบื้องต้น เช่น ชื่อ และรูปภาพโปรไฟล์ของคุณ (ตามสิทธิ์ที่คุณอนุญาต)</li>
                            <li><strong>ข้อมูลทางเทคนิค:</strong> เช่น คุกกี้ (Cookies) ที่จำเป็นต่อการทำงานของระบบ (Session/Authentication) เพื่อรักษาสถานะการเข้าสู่ระบบของคุณ</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. วัตถุประสงค์ในการเก็บข้อมูล</h2>
                        <p>เรานำข้อมูลส่วนบุคคลของคุณไปใช้เพื่อวัตถุประสงค์ดังต่อไปนี้เท่านั้น:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>เพื่อสร้างและยืนยันตัวตนบัญชีผู้ใช้งานของคุณในการเข้าสู่ระบบ</li>
                            <li>เพื่อสนับสนุนการทำงานของระบบ เช่น การจดจำการตั้งค่าผู้ใช้งาน การจัดการคิวซ่อม และการให้บริการภายในแพลตฟอร์ม</li>
                            <li>เพื่อรักษาความปลอดภัยและป้องกันการใช้งานที่ผิดปกติในระบบ</li>
                        </ul>
                        <p className="font-medium text-foreground">
                            * เราไม่มีนโยบายนำข้อมูลอีเมลหรือข้อมูลส่วนบุคคลของคุณไปขาย แลกเปลี่ยน หรือส่งต่อให้บุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาดหรือการโฆษณาโดยเด็ดขาด
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. การจัดเก็บและการเปิดเผยข้อมูล</h2>
                        <p>
                            ข้อมูลของคุณจะถูกจัดเก็บอย่างปลอดภัยผ่านผู้ให้บริการโครงสร้างพื้นฐานฐานข้อมูลและระบบยืนยันตัวตน (Supabase) ซึ่งมีมาตรฐานความปลอดภัยระดับสากล เราจะเปิดเผยข้อมูลก็ต่อเมื่อมีความจำเป็นตามข้อกำหนดทางกฎหมายหรือคำสั่งศาลเท่านั้น
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">4. ระยะเวลาในการเก็บรักษาข้อมูล</h2>
                        <p>
                            เราจะเก็บรักษาข้อมูลส่วนบุคคลของคุณไว้ตราบเท่าที่คุณยังมีบัญชีผู้ใช้งานอยู่กับเรา คุณสามารถติดต่อเพื่อขอให้ลบข้อมูลของคุณได้ และหากคุณไม่ได้ต่ออายุการใช้งานภายใน 30 วัน เราจะดำเนินการลบข้อมูลของคุณออกจากฐานข้อมูลอย่างถาวร
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">5. สิทธิของคุณ (ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล - PDPA)</h2>
                        <p>ในฐานะเจ้าของข้อมูล คุณมีสิทธิดังต่อไปนี้:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>สิทธิในการขอเข้าถึงหรือขอรับสำเนาข้อมูลส่วนบุคคลของคุณ</li>
                            <li>สิทธิในการขอแก้ไขข้อมูลส่วนบุคคลให้ถูกต้อง อัปเดต และสมบูรณ์</li>
                            <li><strong>สิทธิในการขอให้ลบ หรือทำลายข้อมูลส่วนบุคคล (Account Deletion)</strong></li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">6. การติดต่อเรา</h2>
                        <p>หากคุณมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัวฉบับนี้ หรือต้องการใช้สิทธิขอลบข้อมูลบัญชีผู้ใช้งาน (Delete Account) สามารถติดต่อเราได้ที่: getfixxth@gmail.com</p>

                        {/*  commented out this part temporarily to avoid spam
            <div className="bg-muted p-4 rounded-lg mt-2 inline-block">
              <p className="font-medium text-foreground">อีเมลติดต่อ: [ใส่อีเมลของคุณตรงนี้ เช่น hello@getfixx.net]</p>
            </div>*/}
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