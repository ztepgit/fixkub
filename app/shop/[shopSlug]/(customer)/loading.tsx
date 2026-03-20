import { Loader2 } from "lucide-react"

export default function ShopLoading() {
    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium animate-pulse">
                กำลังโหลดข้อมูลร้านค้า...
            </p>
        </div>
    )
}