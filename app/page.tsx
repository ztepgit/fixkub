"use client"

import { useState } from "react"
import { LoginPage } from "@/components/login-page"
import { SubscriptionBanner } from "@/components/subscription-banner"
import { DashboardHeader } from "@/components/dashboard-header"
import { QueueBoard, type QueueItem } from "@/components/queue-board"
import { ShopSettings } from "@/components/shop-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, Settings } from "lucide-react"

// Initial mock data
const initialQueues: QueueItem[] = [
  { id: "1", name: "John Smith", service: "Haircut", status: "pending" },
  { id: "2", name: "Maria Garcia", service: "Haircut + Shave", status: "pending" },
  { id: "3", queueNumber: "A-001", name: "David Lee", service: "Beard Trim", status: "waiting" },
  { id: "4", queueNumber: "A-002", name: "Sarah Johnson", service: "Haircut", status: "waiting" },
  { id: "5", queueNumber: "A-003", name: "Michael Chen", service: "Shave", status: "processing" },
]

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [queues, setQueues] = useState<QueueItem[]>(initialQueues)
  const [shopName, setShopName] = useState("Awesome Barber")
  const [queueCounter, setQueueCounter] = useState(4)

  const handleLogin = () => {
    setIsLoggedIn(true)
  }

  const handleAddQueue = (data: { name: string; phone: string; service: string }) => {
    const newQueueNumber = `A-${String(queueCounter).padStart(3, "0")}`
    const newQueue: QueueItem = {
      id: Date.now().toString(),
      queueNumber: newQueueNumber,
      name: data.name,
      service: data.service.charAt(0).toUpperCase() + data.service.slice(1).replace("-", " + "),
      status: "waiting",
    }
    setQueues([...queues, newQueue])
    setQueueCounter(queueCounter + 1)
  }

  const handleAccept = (id: string) => {
    const newQueueNumber = `A-${String(queueCounter).padStart(3, "0")}`
    setQueues(
      queues.map((q) =>
        q.id === id ? { ...q, status: "waiting" as const, queueNumber: newQueueNumber } : q
      )
    )
    setQueueCounter(queueCounter + 1)
  }

  const handleStartService = (id: string) => {
    setQueues(
      queues.map((q) => (q.id === id ? { ...q, status: "processing" as const } : q))
    )
  }

  const handleFinish = (id: string) => {
    setQueues(queues.filter((q) => q.id !== id))
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-background">
      <SubscriptionBanner />
      <DashboardHeader shopName={shopName} onAddQueue={handleAddQueue} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger value="queue" className="h-10 text-base gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Queue Board
            </TabsTrigger>
            <TabsTrigger value="settings" className="h-10 text-base gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-0">
            <QueueBoard
              queues={queues}
              onAccept={handleAccept}
              onStartService={handleStartService}
              onFinish={handleFinish}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <ShopSettings
              displayName={shopName}
              shopSlug="awesome-barber"
              onDisplayNameChange={setShopName}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
