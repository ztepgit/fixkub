"use client"

import { useState, useEffect } from "react"
import { CustomerBookingForm } from "@/components/customer-booking-form"
import { CustomerQueueStatus } from "@/components/customer-queue-status"

// Simulated shop data - in production this would come from database
const shopData = {
  id: "awesome-barber",
  name: "Awesome Barber",
  logo: null,
  primaryColor: "#10b981", // Emerald green - shop's custom branding
  services: [
    { id: "1", name: "Haircut", duration: 30 },
    { id: "2", name: "Haircut + Beard", duration: 45 },
    { id: "3", name: "Beard Trim", duration: 15 },
    { id: "4", name: "Kids Haircut", duration: 20 },
  ],
}

export default function CustomerQueuePage() {
  const [isInQueue, setIsInQueue] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [queueData, setQueueData] = useState<{
    ticketNumber: string
    name: string
    service: string
    status: "waiting" | "called" | "processing"
    position: number
    estimatedWait: number
  } | null>(null)

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleJoinQueue = (data: { name: string; phone: string; serviceId: string }) => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      const service = shopData.services.find((s) => s.id === data.serviceId)
      setQueueData({
        ticketNumber: "A-012",
        name: data.name,
        service: service?.name || "",
        status: "waiting",
        position: 3,
        estimatedWait: 45,
      })
      setIsInQueue(true)
      setIsLoading(false)
    }, 1000)
  }

  const handleCancelQueue = () => {
    setIsLoading(true)
    setTimeout(() => {
      setQueueData(null)
      setIsInQueue(false)
      setIsLoading(false)
    }, 500)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{ "--shop-primary": shopData.primaryColor } as React.CSSProperties}
    >
      {!isInQueue ? (
        <CustomerBookingForm
          shopName={shopData.name}
          shopLogo={shopData.logo}
          services={shopData.services}
          isLoading={isLoading}
          onSubmit={handleJoinQueue}
        />
      ) : (
        <CustomerQueueStatus
          shopName={shopData.name}
          queueData={queueData!}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onCancel={handleCancelQueue}
        />
      )}
    </div>
  )
}
