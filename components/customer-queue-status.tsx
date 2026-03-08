"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Users, Clock, User, Scissors, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface QueueData {
  ticketNumber: string
  name: string
  service: string
  status: "waiting" | "called" | "processing"
  position: number
  estimatedWait: number
}

interface CustomerQueueStatusProps {
  shopName: string
  queueData: QueueData
  isLoading: boolean
  onRefresh: () => void
  onCancel: () => void
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  )
}

const statusConfig = {
  waiting: {
    label: "Waiting",
    bgClass: "bg-amber-100 text-amber-800",
  },
  called: {
    label: "You're Up!",
    bgClass: "bg-emerald-100 text-emerald-800",
  },
  processing: {
    label: "Being Served",
    bgClass: "bg-blue-100 text-blue-800",
  },
}

export function CustomerQueueStatus({
  shopName,
  queueData,
  isLoading,
  onRefresh,
  onCancel,
}: CustomerQueueStatusProps) {
  const status = statusConfig[queueData.status]

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Header Skeleton */}
        <header className="px-6 py-6 flex items-center justify-between">
          <Skeleton className="w-32 h-6" />
          <Skeleton className="w-10 h-10 rounded-full" />
        </header>

        {/* Main Content Skeleton */}
        <main className="flex-1 px-4 pb-8 flex flex-col">
          <div className="text-center mb-6">
            <Skeleton className="w-20 h-6 mx-auto mb-4" />
            <Skeleton className="w-40 h-24 mx-auto rounded-2xl mb-4" />
            <Skeleton className="w-24 h-8 mx-auto rounded-full" />
          </div>

          <Card className="border-0 shadow-lg flex-1">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-full h-14 rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{shopName}</h1>
        <button
          onClick={onRefresh}
          className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Refresh status"
        >
          <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pb-8 flex flex-col">
        {/* Queue Number Display */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-3">
            Your Queue Number
          </p>
          <div
            className="inline-block px-8 py-6 rounded-2xl mb-4"
            style={{ backgroundColor: "var(--shop-primary)" }}
          >
            <span className="text-5xl font-bold text-white tracking-tight">
              {queueData.ticketNumber}
            </span>
          </div>
          <div className="flex justify-center">
            <Badge className={cn("text-sm px-4 py-1.5 rounded-full font-medium", status.bgClass)}>
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: "var(--shop-primary)" }}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium text-foreground">{queueData.name}</p>
                </div>
              </div>

              {/* Service */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary text-foreground shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium text-foreground">{queueData.service}</p>
                </div>
              </div>

              {/* Position - Highlighted */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: "var(--shop-primary)" }}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-emerald-700">Position</p>
                  <p className="font-semibold text-foreground">
                    {queueData.position === 0 ? (
                      "You're next!"
                    ) : (
                      <span>
                        <span className="text-lg">{queueData.position}</span>{" "}
                        {queueData.position === 1 ? "queue" : "queues"} ahead of you
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Estimated Wait */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary text-foreground shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Wait</p>
                  <p className="font-medium text-foreground">
                    ~{queueData.estimatedWait} mins
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancel Button - Danger Zone */}
        <div className="mt-auto pt-8">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive rounded-xl"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel My Queue
          </Button>
        </div>
      </main>
    </div>
  )
}
