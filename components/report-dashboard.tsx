"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, TrendingUp, AlertCircle, Wrench, Wallet, Target, CheckCircle2, Search, Filter, ClipboardX } from "lucide-react"
import { getAnalyticsSummary, getTrendData, getCancelledJobsDetails } from "@/actions/report"

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#f43f5e', '#f97316', '#eab308', '#8b5cf6', '#64748b'];

const translateCancelReason = (reason: string) => {
    switch (reason) {
        case "NO_SHOW": return "ลูกค้าไม่มาส่งเครื่อง"
        case "CUSTOMER_CANCEL": return "ลูกค้าเปลี่ยนใจ/ไม่ซ่อม"
        case "UNREPAIRABLE": return "เครื่องซ่อมไม่ได้/บอร์ดพัง"
        case "NO_PARTS": return "ไม่มีอะไหล่"
        case "UNCONTACTABLE": return "ติดต่อไม่ได้/ทิ้งเครื่อง"
        default: return reason || "ไม่ระบุสาเหตุ"
    }
}

export function ReportDashboard() {
    const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month')
    const [summary, setSummary] = useState<any>(null)
    const [trend, setTrend] = useState<any[]>([])

    // State สำหรับตารางยกเลิกงาน
    const [cancelledList, setCancelledList] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [filterReason, setFilterReason] = useState("ALL")

    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [timeframe])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [summaryRes, trendRes, cancelRes] = await Promise.all([
                getAnalyticsSummary("shop_test_001"),
                getTrendData("shop_test_001", timeframe),
                getCancelledJobsDetails("shop_test_001") // ดึงรายการยกเลิก
            ])

            if (summaryRes.success) setSummary(summaryRes.data)
            if (trendRes.success) setTrend(trendRes.data || [])
            if (cancelRes.success) setCancelledList(cancelRes.data || [])
        } catch (error) {
            console.error("Failed to load reports:", error)
        }
        setIsLoading(false)
    }

    // คำนวณเปอร์เซ็นต์ซ่อมสำเร็จ
    const successRate = summary?.totalJobs > 0
        ? Math.round((summary.completedJobs / summary.totalJobs) * 100) : 0

    const pieData = summary?.cancelReasons?.map((item: any) => ({
        name: translateCancelReason(item.reason),
        value: item.count
    })) || []

    // ฟิลเตอร์ตาราง
    const filteredCancelledJobs = cancelledList.filter(job => {
        const matchesSearch =
            (job.jobRef || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (job.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (job.deviceModel || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = filterReason === "ALL" || job.cancelReason === filterReason;

        return matchesSearch && matchesFilter;
    });

    if (isLoading && !summary) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-lg">กำลังประมวลผลข้อมูลสถิติ...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">รายงานและสถิติ (Analytics)</h2>
                <p className="text-sm text-slate-500">วิเคราะห์ภาพรวม รายได้ และประสิทธิภาพของร้าน</p>
            </div>

            {/* 1. การ์ดสรุปยอด All-Time */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">รายได้รวมตลอดกาล</CardTitle>
                        <Wallet className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">฿{(summary?.totalRevenue || 0).toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" /> เก็บเงินเรียบร้อยแล้ว
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">คิวที่ลูกค้าแจ้งซ่อม</CardTitle>
                        <Wrench className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{summary?.totalJobs || 0} <span className="text-sm font-normal text-slate-500">เครื่อง</span></div>
                        <p className="text-xs text-slate-500 mt-1">คิวงานทั้งหมดในระบบ</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-emerald-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">เก็บเงินแล้ว</CardTitle>
                        <Target className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{successRate}%</div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> ปิดจ๊อบแล้ว {summary?.completedJobs || 0} เครื่อง
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-rose-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">ยกเลิก / ซ่อมไม่ได้</CardTitle>
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-700">{summary?.cancelledJobs || 0} <span className="text-sm font-normal text-rose-500/70">เครื่อง</span></div>
                        <p className="text-xs text-slate-500 mt-1">งานที่ถูกตีกลับหรือยกเลิก</p>
                    </CardContent>
                </Card>
            </div>

            {/* 2. กราฟ (เหมือนเดิม) */}
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)} className="space-y-4">
                <div className="flex justify-end">
                    <TabsList className="grid w-[300px] grid-cols-3 bg-slate-100 border border-slate-200">
                        <TabsTrigger value="week">สัปดาห์นี้</TabsTrigger>
                        <TabsTrigger value="month">เดือนนี้</TabsTrigger>
                        <TabsTrigger value="year">ปีนี้</TabsTrigger>
                    </TabsList>
                </div>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">แนวโน้มรายได้ (Revenue Trend)</CardTitle>
                        <CardDescription>แสดงยอดรายได้ที่เก็บเงินแล้วตามช่วงเวลา</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            {isLoading ? (
                                <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    {timeframe === 'month' ? (
                                        <LineChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `฿${value.toLocaleString()}`} />
                                            <RechartsTooltip
                                                formatter={(value: number) => [`฿${value.toLocaleString()}`, 'รายได้']}
                                                labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
                                        </LineChart>
                                    ) : (
                                        <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `฿${value.toLocaleString()}`} />
                                            <RechartsTooltip
                                                cursor={{ fill: '#f1f5f9' }}
                                                formatter={(value: number) => [`฿${value.toLocaleString()}`, 'รายได้']}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">ประสิทธิภาพงานซ่อม (Performance)</CardTitle>
                            <CardDescription>เปรียบเทียบจำนวนเครื่องที่เริ่มแกะซ่อม กับ ซ่อมเสร็จ</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full mt-2">
                                {isLoading ? (
                                    <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <RechartsTooltip
                                                cursor={{ fill: '#f1f5f9' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: number, name: string) => [value, name === 'processing' ? 'เริ่มแกะซ่อม' : 'ซ่อมเสร็จ']}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} formatter={(value) => value === 'processing' ? 'เริ่มแกะซ่อม' : 'ซ่อมเสร็จ'} />
                                            <Bar dataKey="processing" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                            <Bar dataKey="repaired" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg text-rose-700 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" /> วิเคราะห์สาเหตุยกเลิกงาน
                            </CardTitle>
                            <CardDescription>ข้อมูลรวมตลอดกาล (All-Time)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {pieData.length === 0 ? (
                                <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-400 opacity-50" />
                                    <p>ยังไม่มีงานที่ถูกยกเลิกในระบบ 🎉</p>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row items-center h-[280px]">
                                    <div className="h-[200px] w-full md:w-1/2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {pieData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-full md:w-1/2 space-y-3 px-2">
                                        {pieData.map((item: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                    <span className="text-slate-600 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                                </div>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold">{item.value}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Tabs>

            {/* 🌟 3. ตารางรายการยกเลิกงาน (เพิ่มใหม่) */}
            <Card className="shadow-sm border-slate-200 mt-6">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ClipboardX className="h-5 w-5 text-rose-600" />
                                รายการงานที่ถูกยกเลิกทั้งหมด
                            </CardTitle>
                            <CardDescription className="mt-1">ค้นหาและกรองประวัติการยกเลิกงานเพื่อปรับปรุงบริการ (รวม {filteredCancelledJobs.length} รายการ)</CardDescription>
                        </div>
                      
                        <div className="flex items-center gap-3">
                              {/* คอมเมนต์
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="ค้นหาบิล, ชื่อลูกค้า, รุ่น..."
                                    className="pl-9 h-9 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                
                            </div> */}
                            <Select value={filterReason} onValueChange={setFilterReason}>
                                <SelectTrigger className="w-[180px] h-9 text-sm">
                                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="กรองสาเหตุ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">ทุกสาเหตุ</SelectItem>
                                    <SelectItem value="NO_SHOW">ลูกค้าไม่มาส่งเครื่อง</SelectItem>
                                    <SelectItem value="CUSTOMER_CANCEL">ลูกค้าเปลี่ยนใจ/ไม่ซ่อม</SelectItem>
                                    <SelectItem value="UNREPAIRABLE">เครื่องซ่อมไม่ได้</SelectItem>
                                    <SelectItem value="NO_PARTS">ไม่มีอะไหล่</SelectItem>
                                    <SelectItem value="UNCONTACTABLE">ติดต่อไม่ได้/ทิ้งเครื่อง</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* 🌟 1. ครอบด้วย div ที่จำกัดความสูง (max-h-[500px]) และสั่งให้มี Scroll (overflow-auto) */}
                    <div className="max-h-[500px] overflow-auto relative">
                        <Table>
                            {/* 🌟 2. เพิ่ม sticky top-0 และ z-10 เข้าไป เพื่อล็อคหัวตารางให้ติดหนึบเวลาเลื่อนลง */}
                            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                                    <TableHead>วันที่ยกเลิก</TableHead>
                                    <TableHead>รหัสบิล / ลูกค้า</TableHead>
                                    <TableHead>รุ่นเครื่อง</TableHead>
                                    <TableHead>สาเหตุการยกเลิก</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCancelledJobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                            ไม่พบข้อมูลที่ค้นหา
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCancelledJobs.map((job, index) => (
                                        <TableRow key={job.id}>
                                            <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {job.cancelledAt ? new Date(job.cancelledAt).toLocaleDateString('th-TH') : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-800">{job.jobRef}</div>
                                                <div className="text-xs text-slate-500">{job.customerName}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-700">{job.deviceModel}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                                                    {translateCancelReason(job.cancelReason)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}