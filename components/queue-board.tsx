"use client"

import { Check, Play, Square, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface QueueItem {
  id: string
  queueNumber?: string
  name: string
  service: string
  status: "pending" | "waiting" | "processing"
}

interface QueueBoardProps {
  queues: QueueItem[]
  onAccept: (id: string) => void
  onStartService: (id: string) => void
  onFinish: (id: string) => void
}

function QueueCard({ 
  queue, 
  action 
}: { 
  queue: QueueItem
  action: React.ReactNode 
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {queue.queueNumber && (
              <Badge variant="secondary" className="font-mono text-xs">
                {queue.queueNumber}
              </Badge>
            )}
            <span className="font-medium text-foreground truncate">{queue.name}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{queue.service}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function QueueBoard({ queues, onAccept, onStartService, onFinish }: QueueBoardProps) {
  const pendingQueues = queues.filter((q) => q.status === "pending")
  const waitingQueues = queues.filter((q) => q.status === "waiting")
  const processingQueues = queues.filter((q) => q.status === "processing")

  return (
    <div className="space-y-6">
      {/* Pending Section */}
      <Card className="border-l-4 border-l-warning">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-2 h-2 rounded-full bg-warning" />
            Pending (QR Scans)
            {pendingQueues.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {pendingQueues.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingQueues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending queues
            </p>
          ) : (
            pendingQueues.map((queue) => (
              <QueueCard
                key={queue.id}
                queue={queue}
                action={
                  <Button
                    size="lg"
                    onClick={() => onAccept(queue.id)}
                    className="bg-success hover:bg-success/90 text-success-foreground h-11 px-5 font-medium shrink-0"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Accept
                  </Button>
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Waiting Section */}
      <Card className="border-l-4 border-l-info">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-2 h-2 rounded-full bg-info" />
            Waiting
            {waitingQueues.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {waitingQueues.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {waitingQueues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No customers waiting
            </p>
          ) : (
            waitingQueues.map((queue) => (
              <QueueCard
                key={queue.id}
                queue={queue}
                action={
                  <Button
                    size="lg"
                    onClick={() => onStartService(queue.id)}
                    className="bg-info hover:bg-info/90 text-info-foreground h-11 px-5 font-medium shrink-0"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Service
                  </Button>
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Processing Section */}
      <Card className="border-l-4 border-l-muted-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            Processing
            {processingQueues.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {processingQueues.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {processingQueues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No customers being served
            </p>
          ) : (
            processingQueues.map((queue) => (
              <QueueCard
                key={queue.id}
                queue={queue}
                action={
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => onFinish(queue.id)}
                    className="h-11 px-5 font-medium shrink-0"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Finish
                  </Button>
                }
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
