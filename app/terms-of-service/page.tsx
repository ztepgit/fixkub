// app/privacy-policy/page.tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "เงื่อนไขการใช้บริการ | Fixkub",
    description: "เงื่อนไขการใช้บริการ (Terms of Service) ของเว็บไซต์ Fixkub.net",
};

export default function TermsOfServicePage() {
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
                        เงื่อนไขการใช้บริการ (Terms of Service)
                    </h1>
                    <p className="text-muted-foreground">
                        ปรับปรุงล่าสุด: 26 มิถุนายน 2569
                    </p>
                </div>

                {/* เนื้อหานโยบาย */}
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/80 space-y-6">
                    <p>
                        ยินดีต้อนรับสู่ Fixkub ("เรา", "พวกเรา", หรือ "ของเรา") ข้อตกลงและเงื่อนไขฉบับนี้มีผลบังคับใช้กับการเข้าถึงและใช้งานเว็บไซต์ แอปพลิเคชัน และบริการจัดการคิวซ่อมมือถือของเรา (รวมเรียกว่า "บริการ")
                    </p>
                    <p>
                        การที่ท่านสมัครสมาชิกและเข้าใช้งานระบบ Fixkub ถือว่าท่านได้อ่าน ทำความเข้าใจ และยอมรับข้อตกลงและเงื่อนไขเหล่านี้อย่างครบถ้วน หากท่านไม่เห็นด้วยกับข้อตกลงนี้ โปรดงดการใช้งานบริการของเรา
                    </p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. คำอธิบายบริการ (Description of Service)</h2>
                        <p>
                            Fixkub คือระบบซอฟต์แวร์สำหรับการจัดการคิวซ่อมโทรศัพท์มือถือ (SaaS) เพื่ออำนวยความสะดวกให้กับร้านค้าในการจัดลำดับคิวและแจ้งเตือนสถานะงานซ่อมให้กับลูกค้าของร้านค้า
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. การลงทะเบียนและบัญชีผู้ใช้งาน (Account Registration)</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>ผู้ใช้งานจะต้องให้ข้อมูลที่เป็นความจริงและเป็นปัจจุบันในการสมัครสมาชิก</li>
                            <li>ผู้ใช้งานมีหน้าที่รักษาความลับของรหัสผ่านและข้อมูลบัญชีของตนเอง</li>
                            <li>เราขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีผู้ใช้งาน หากพบว่ามีการให้ข้อมูลที่เป็นเท็จ หรือมีการใช้งานที่ละเมิดข้อตกลงฉบับนี้</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. เงื่อนไขการชำระเงิน (Payment Terms)</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>รูปแบบการชำระเงิน:</strong> บริการของเราเป็นรูปแบบการชำระเงินล่วงหน้า (Prepaid / Pay-per-use) ท่านจะต้องชำระเงินเพื่อซื้อแพ็กเกจหรือเครดิตสิทธิ์การใช้งานก่อนเริ่มใช้งานระบบ</li>
                            <li><strong>การประมวลผล:</strong> การรับชำระเงินทั้งหมดดำเนินการผ่านผู้ให้บริการรับชำระเงินบุคคลที่สาม (Stripe / PromptPay) ข้อมูลการชำระเงินของท่านจะถูกประมวลผลอย่างปลอดภัย</li>
                            <li><strong>ราคาและภาษี:</strong> ราคาที่แสดงบนเว็บไซต์ ไม่รวมภาษีมูลค่าเพิ่ม เราขอสงวนสิทธิ์ในการเปลี่ยนแปลงราคาแพ็กเกจในอนาคต โดยจะแจ้งให้ทราบล่วงหน้าผ่านทางเว็บไซต์</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">4. นโยบายการคืนเงิน (Refund Policy)</h2>
                        <p>
                            เนื่องจากบริการของเราเป็นรูปแบบการชำระเงินล่วงหน้า การสั่งซื้อที่สำเร็จแล้วจะไม่สามารถขอคืนเงินได้ในทุกกรณี (All sales are final) ยกเว้นกรณีที่เกิดจากความผิดพลาดของระบบเราอย่างร้ายแรง โปรดศึกษารายละเอียดเพิ่มเติมที่ <Link href="/refund-policy" className="text-primary hover:underline">นโยบายการคืนเงิน</Link>
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">5. ข้อจำกัดในการใช้งาน (User Conduct)</h2>
                        <p>ผู้ใช้งานตกลงที่จะไม่ใช้บริการ Fixkub ในทางต่อไปนี้:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>ใช้เพื่อวัตถุประสงค์ที่ผิดกฎหมาย ละเมิดสิทธิผู้อื่น หรือฉ้อโกง</li>
                            <li>พยายามเจาะระบบ (Hack) ส่งไวรัส หรือรบกวนการทำงานของเซิร์ฟเวอร์</li>
                            <li>ขายต่อ (Resell) หรือให้เช่าช่วงสิทธิ์การใช้งานระบบโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษรจากเรา</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">6. การจำกัดความรับผิดชอบ (Limitation of Liability)</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>เราให้บริการระบบตามสภาพที่เป็นอยู่ ("As is") และไม่รับประกันว่าระบบจะทำงานได้โดยปราศจากข้อผิดพลาด หรือทำงานได้ต่อเนื่อง 100% ตลอดเวลา</li>
                            <li>เราจะไม่รับผิดชอบต่อความสูญเสียทางธุรกิจ รายได้ หรือความเสียหายทางอ้อมใดๆ ของร้านค้าท่าน ที่เกิดจากความขัดข้องของระบบ Fixkub ชั่วคราว หรือเหตุสุดวิสัยนอกเหนือการควบคุม</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">7. การยกเลิกการให้บริการ (Termination)</h2>
                        <p>
                            เรามีสิทธิ์ในการระงับหรือยกเลิกบัญชีผู้ใช้งานของท่านได้ทันที โดยไม่ต้องแจ้งให้ทราบล่วงหน้าและไม่มีการคืนเงิน หากเราพบว่าท่านละเมิดข้อตกลงและเงื่อนไขฉบับนี้
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">8. กฎหมายที่บังคับใช้ (Governing Law)</h2>
                        <p>
                            ข้อตกลงและเงื่อนไขฉบับนี้ให้อยู่ภายใต้การบังคับและตีความตามกฎหมายของประเทศไทย
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">9. การติดต่อเรา (Contact Us)</h2>
                        <p>หากท่านมีข้อสงสัยเกี่ยวกับข้อตกลงและเงื่อนไขฉบับนี้ สามารถติดต่อเราได้ที่:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>อีเมล: support@fixkub.net</li>
                            <li>โทรศัพท์: +66 641897530</li>
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