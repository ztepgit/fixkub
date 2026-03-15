"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Smartphone, Wrench, User, PenLine } from "lucide-react"

const COMMON_SERVICES = [
    "เปลี่ยนจอ",
    "เปลี่ยนแบต",
    "ติดฟิล์ม",
    "ชาร์จไม่เข้า",
    "เปิดไม่ติด",
    "โดนน้ำ",
    "ปลดล็อคเครื่อง",
    "เช็คอาการ",
]

// 💎 เพิ่ม Interface สำหรับ Props
interface ShopOwnerCreateQueueProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

// 💎 รับ Props เข้ามาใน Component
export function ShopOwnerCreateQueue({ onCancel, onSuccess }: ShopOwnerCreateQueueProps) {
    const [serviceName, setServiceName] = useState<string>("")
    const [deviceModel, setDeviceModel] = useState<string>("")
    const [deviceColor, setDeviceColor] = useState<string>("")
    const [issue, setIssue] = useState<string>("")
    const [customerName, setCustomerName] = useState<string>("")
    const [phone, setPhone] = useState<string>("")

    const handleChipClick = (service: string) => {
        setServiceName(service)
    }

    const handleSubmit = () => {
        console.log({
            serviceName, deviceModel, deviceColor, issue, customerName, phone
        })
        
        // TODO: ส่งข้อมูลแล้ว Redirect กลับไปหน้า Queue Board (หรืออัปเดต State)
        
        // 💎 เรียกใช้ onSuccess เมื่อกดสร้างคิวเสร็จ เพื่อให้ Dialog ปิดตัวลง
        if (onSuccess) {
            onSuccess()
        }
    }

    return (
        <div className="mx-auto w-full max-w-2xl space-y-4">
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <Wrench className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">สร้างคิวซ่อมใหม่</CardTitle>
                            <CardDescription>เปิดบิลรับเครื่องหน้าเคาน์เตอร์</CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">

                    {/* คอลัมน์ซ้าย: อาการและรายละเอียด */}
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <Label htmlFor="serviceName" className="font-semibold flex items-center gap-2">
                                <PenLine className="h-4 w-4 text-slate-500" /> บริการ / อาการเสีย <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="serviceName"
                                placeholder="เช่น เปลี่ยนจอ, เครื่องเปิดไม่ติด"
                                value={serviceName}
                                onChange={(e) => setServiceName(e.target.value)}
                            />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {COMMON_SERVICES.map((service) => (
                                    <button
                                        key={service}
                                        type="button"
                                        onClick={() => handleChipClick(service)}
                                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${serviceName === service
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        {service}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issue" className="text-sm font-medium text-slate-700">รายละเอียดอาการเพิ่มเติม</Label>
                            <Textarea
                                id="issue"
                                placeholder="อธิบายอาการเพิ่มเติม (ถ้ามี) เช่น ทำตกจอแตก ทัชไม่ได้ฝั่งขวา"
                                className="resize-none min-h-[105px]"
                                value={issue}
                                onChange={(e) => setIssue(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* คอลัมน์ขวา: ข้อมูลเครื่องและลูกค้า */}
                    <div className="space-y-5">
                        <div className="space-y-4">
                            <Label className="font-semibold flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-slate-500" /> ข้อมูลตัวเครื่อง
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="deviceModel" className="text-xs text-slate-500">รุ่นมือถือ <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="deviceModel"
                                        placeholder="เช่น iPhone 13"
                                        value={deviceModel}
                                        onChange={(e) => setDeviceModel(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deviceColor" className="text-xs text-slate-500">สีเครื่อง</Label>
                                    <Input
                                        id="deviceColor"
                                        placeholder="เช่น ดำ"
                                        value={deviceColor}
                                        onChange={(e) => setDeviceColor(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <Label className="font-semibold flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-500" /> ข้อมูลติดต่อ
                            </Label>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="customerName" className="text-xs text-slate-500">ชื่อลูกค้า <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="customerName"
                                        placeholder="ชื่อ หรือ ชื่อเล่น"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-xs text-slate-500">เบอร์โทรศัพท์ (ถ้ามี)</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="08x-xxx-xxxx"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>

                <CardFooter className="bg-slate-50 border-t pt-4 pb-4 flex justify-end gap-3 rounded-b-xl">
                    {/* 💎 ผูก onClick เข้ากับ onCancel เพื่อให้ปุ่มยกเลิกทำงานปิดหน้าต่างได้ */}
                    <Button variant="outline" type="button" onClick={onCancel}>
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700 px-8"
                        disabled={!serviceName || !deviceModel || !customerName}
                    >
                        สร้างคิว
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}