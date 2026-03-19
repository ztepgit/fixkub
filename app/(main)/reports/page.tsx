import { ReportDashboard } from "@/components/report-dashboard"

export const metadata = {
  title: "รายงานและสถิติ | esyq",
  description: "ภาพรวมสถิติร้านซ่อมมือถือของคุณ",
}

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <ReportDashboard />
    </div>
  )
}