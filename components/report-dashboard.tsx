"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button" 
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
    Loader2, TrendingUp, AlertCircle, Wrench, Wallet, Target, CheckCircle2, 
    Search, Filter, ClipboardX, Eye, EyeOff, CalendarRange 
} from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { cn } from "@/lib/utils"

import { getAnalyticsSummary, getTrendData, getCancelledJobsDetails } from "@/actions/report"
// 🌟 1. Import Store เพื่อดึง shopId ปัจจุบัน
import { useShopStore } from "@/store/useShopStore"

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

import { DateRange } from "react-day-picker"

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
    // 🌟 2. ดึง shopId ของจริงออกมาจาก Zustand Store
    const shopId = useShopStore((state) => state.shop?.id)

    const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('today')
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date()
    })

    const [summary, setSummary] = useState<any>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [isHidden, setIsHidden] = useState(false)
    const [cancelledList, setCancelledList] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [filterReason, setFilterReason] = useState("ALL")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // 🌟 3. ถ้ายังไม่มี shopId (เช่น กำลังโหลด) ให้รอไปก่อน
        if (!shopId) return;

        if (timeframe !== 'custom') {
            loadData()
        } else if (timeframe === 'custom' && dateRange?.from && dateRange?.to) {
            loadData()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeframe, dateRange?.from, dateRange?.to, shopId])

    const loadData = async () => {
        if (!shopId) return;
        
        setIsLoading(true)
        try {
            // 🌟 4. เปลี่ยนจากการฮาร์ดโค้ดเป็นดึงผ่าน shopId ตัวแปรจริง
            const [summaryRes, trendRes, cancelRes] = await Promise.all([
                getAnalyticsSummary(shopId, timeframe, dateRange?.from, dateRange?.to),
                getTrendData(shopId, timeframe, dateRange?.from, dateRange?.to),
                getCancelledJobsDetails(shopId, timeframe, dateRange?.from, dateRange?.to) 
            ])

            if (summaryRes.success) setSummary(summaryRes.data)
            if (trendRes.success) setTrend(trendRes.data || [])
            if (cancelRes.success) setCancelledList(cancelRes.data || [])
        } catch (error) {
            console.error("Failed to load reports:", error)
        }
        setIsLoading(false)
    }

    const successRate = summary?.totalJobs > 0
        ? Math.round((summary.completedJobs / summary.totalJobs) * 100) : 0

    const pieData = summary?.cancelReasons?.map((item: any) => ({
        name: translateCancelReason(item.reason),
        value: item.count
    })) || []

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

    // 🌟 ดัก Error กรณีที่ User ไม่มีร้าน
    if (!shopId && !isLoading) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center text-rose-500 gap-3">
                <AlertCircle className="h-8 w-8" />
                <p className="text-lg">ไม่พบข้อมูลร้านค้า กรุณารีเฟรชหน้าจอ</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">รายงานและสถิติ (Analytics)</h2>
                    <p className="text-sm text-slate-500">วิเคราะห์ภาพรวม รายได้ และประสิทธิภาพของร้าน</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => setIsHidden(!isHidden)} 
                    className="text-slate-600 border-slate-300 hover:bg-slate-100"
                >
                    {isHidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                    {isHidden ? "ดูข้อมูล" : "ซ่อนข้อมูล"}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">รายได้รวมช่วงนี้</CardTitle>
                        <Wallet className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">
                            {isHidden ? "฿***" : `฿${(summary?.totalRevenue || 0).toLocaleString()}`}
                        </div>
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
                        <div className="text-2xl font-bold text-slate-800">
                            {isHidden ? "***" : (summary?.totalJobs || 0)} <span className="text-sm font-normal text-slate-500">เครื่อง</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">คิวงานทั้งหมดในระบบ</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-emerald-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">เก็บเงินแล้ว</CardTitle>
                        <Target className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">
                            {isHidden ? "***%" : `${successRate}%`}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> ปิดจ๊อบแล้ว {isHidden ? "***" : (summary?.completedJobs || 0)} เครื่อง
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-rose-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">ยกเลิก / ซ่อมไม่ได้</CardTitle>
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-700">
                            {isHidden ? "***" : (summary?.cancelledJobs || 0)} <span className="text-sm font-normal text-rose-500/70">เครื่อง</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">งานที่ถูกตีกลับหรือยกเลิก</p>
                    </CardContent>
                </Card>
            </div>

            {/* ส่วนจัดการแท็บและปฏิทิน */}
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)} className="space-y-4">
                <div className="flex flex-col xl:flex-row justify-end items-end xl:items-center gap-3">
                    
                    {timeframe === 'custom' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date"
                                        variant={"outline"}
                                        className={cn(
                                            "w-[260px] justify-start text-left font-medium border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarRange className="mr-2 h-4 w-4 text-emerald-600" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "d MMM yyy", { locale: th })} -{" "}
                                                    {format(dateRange.to, "d MMM yyy", { locale: th })}
                                                </>
                                            ) : (
                                                format(dateRange.from, "d MMM yyy", { locale: th })
                                            )
                                        ) : (
                                            <span>เลือกวันเริ่มต้น - สิ้นสุด</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={(range: DateRange | undefined) => setDateRange(range)}
                                        numberOfMonths={2}
                                        locale={th}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {/* แท็บตัวกรองวันที่ */}
                    <TabsList className="grid w-full xl:w-[420px] grid-cols-5 bg-slate-100 border border-slate-200 h-10">
                        <TabsTrigger value="today">วันนี้</TabsTrigger>
                        <TabsTrigger value="week">สัปดาห์นี้</TabsTrigger>
                        <TabsTrigger value="month">เดือนนี้</TabsTrigger>
                        <TabsTrigger value="year">ปีนี้</TabsTrigger>
                        <TabsTrigger value="custom" className="data-[state=active]:text-emerald-700">ปฏิทิน</TabsTrigger>
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
                                    {timeframe === 'month' || timeframe === 'custom' || timeframe === 'today' ? (
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
                            <CardDescription>สัดส่วนการยกเลิกในช่วงเวลานี้</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {pieData.length === 0 ? (
                                <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-400 opacity-50" />
                                    <p>ยังไม่มีงานที่ถูกยกเลิกในช่วงนี้ 🎉</p>
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

            <Card className="shadow-sm border-slate-200 mt-6">
                <CardHeader className="border-b bg-slate-50/50 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ClipboardX className="h-5 w-5 text-rose-600" />
                                รายการงานที่ถูกยกเลิก
                            </CardTitle>
                            <CardDescription className="mt-1">ค้นหาและกรองประวัติการยกเลิกงาน (รวม {filteredCancelledJobs.length} รายการ)</CardDescription>
                        </div>
                      
                        <div className="flex items-center gap-3">
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
                    <div className="max-h-[500px] overflow-auto relative">
                        <Table>
                            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                                    <TableHead>วันที่ยกเลิก</TableHead>
                                    <TableHead>รหัสบิล / ลูกค้า</TableHead>
                                    <TableHead>รุ่นเครื่อง</TableHead>
                                    <TableHead>บริการ</TableHead>
                                    <TableHead>สาเหตุการยกเลิก</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCancelledJobs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-slate-500"> 
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
                                            
                                            <TableCell className="text-sm text-slate-600 max-w-[200px]">
                                                <p className="truncate" title={`${job.serviceName || "ไม่ได้ระบุบริการ"} ${job.issue ? `- ${job.issue}` : ""}`}>
                                                    <span className="font-semibold text-emerald-700">[{job.serviceName || "ทั่วไป"}]</span> {job.issue || ""}
                                                </p>
                                            </TableCell>

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