"use client"

import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function SubscriptionBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-warning text-warning-foreground px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            Your free trial expires in <span className="font-bold">5 days</span>. 
            Upgrade to Yearly Plan (490 THB/Year) to keep your system running.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-warning-foreground text-warning hover:bg-warning-foreground/90 font-medium"
          >
            Upgrade Now
          </Button>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-warning-foreground/10 rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
