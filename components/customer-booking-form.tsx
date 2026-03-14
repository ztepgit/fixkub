"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Clock, Store, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Service {
  id: string
  name: string
  duration: number
}

interface CustomerBookingFormProps {
  shopName: string
  shopLogo: string | null
  services: Service[]
  isLoading: boolean
  onSubmit: (data: { name: string; phone: string; serviceId: string }) => void
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  )
}

export function CustomerBookingForm({
  shopName,
  shopLogo,
  services,
  isLoading,
  onSubmit,
}: CustomerBookingFormProps) {
  const [selectedService, setSelectedService] = useState<string>("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedService || !name.trim()) return
    onSubmit({ name: name.trim(), phone: phone.trim(), serviceId: selectedService })
  }

  const isValid = selectedService && name.trim()

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Header Skeleton */}
        <header className="px-6 py-8 text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto mb-3" />
          <Skeleton className="w-40 h-6 mx-auto" />
        </header>

        {/* Form Skeleton */}
        <main className="flex-1 px-4 pb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <Skeleton className="w-24 h-4 mb-3" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="w-full h-16 rounded-xl" />
                    ))}
                  </div>
                </div>
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-12 rounded-xl" />
                <Skeleton className="w-full h-14 rounded-xl" />
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
      <header className="px-6 py-8 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white"
          style={{ backgroundColor: "var(--shop-primary)" }}
        >
          {shopLogo ? (
            <img src={shopLogo} alt={shopName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <Store className="w-8 h-8" />
          )}
        </div>
        <h1 className="text-xl font-semibold text-foreground">{shopName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Join the queue</p>
      </header>

      {/* Form */}
      <main className="flex-1 px-4 pb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-6">
                {/* Service Selection */}
                <Field>
                  <FieldLabel className="text-sm font-medium text-foreground mb-3 block">
                    Select Service
                  </FieldLabel>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedService(service.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between",
                          selectedService === service.id
                            ? "border-[var(--shop-primary)] bg-[var(--shop-primary)]/5"
                            : "border-border hover:border-muted-foreground/30 bg-card"
                        )}
                      >
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{service.duration} mins</span>
                          </div>
                        </div>
                        {selectedService === service.id && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: "var(--shop-primary)" }}
                          >
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Name Input */}
                <Field>
                  <FieldLabel className="text-sm font-medium text-foreground">
                    Your Name <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 text-base rounded-xl border-border"
                    required
                  />
                </Field>

                {/* Phone Input */}
                <Field>
                  <FieldLabel className="text-sm font-medium text-foreground">
                    Phone Number <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <Input
                    type="tel"
                    placeholder="เบอร์โทรศัพท์ (ไม่บังคับ)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 text-base rounded-xl border-border"
                  />
                </Field>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!isValid}
                  className="w-full h-14 text-base font-semibold rounded-xl transition-all duration-200 disabled:opacity-50"
                  style={{
                    backgroundColor: isValid ? "var(--shop-primary)" : undefined,
                    color: isValid ? "white" : undefined,
                  }}
                >
                  Get Queue Ticket
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
