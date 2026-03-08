"use client"

import { Plus, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useState, useEffect } from "react"

interface DashboardHeaderProps {
  shopName: string
  onAddQueue: (data: { name: string; phone: string; service: string }) => void
}

export function DashboardHeader({ shopName, onAddQueue }: DashboardHeaderProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [service, setService] = useState("")
  const [today, setToday] = useState("")

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    )
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name && phone && service) {
      onAddQueue({ name, phone, service })
      setName("")
      setPhone("")
      setService("")
      setOpen(false)
    }
  }

  return (
    <header className="border-b border-border bg-card px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{shopName}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="w-4 h-4" />
              <span>{today}</span>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12 px-6 text-base font-medium">
                <Plus className="w-5 h-5 mr-2" />
                Add Queue Manually
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Queue</DialogTitle>
                <DialogDescription>
                  Manually add a customer to the queue
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="customer-name">Customer Name</FieldLabel>
                    <Input
                      id="customer-name"
                      placeholder="Enter customer name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="service">Select Service</FieldLabel>
                    <Select value={service} onValueChange={setService} required>
                      <SelectTrigger id="service" className="h-11">
                        <SelectValue placeholder="Choose a service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="haircut">Haircut</SelectItem>
                        <SelectItem value="shave">Shave</SelectItem>
                        <SelectItem value="haircut-shave">Haircut + Shave</SelectItem>
                        <SelectItem value="beard-trim">Beard Trim</SelectItem>
                        <SelectItem value="hair-wash">Hair Wash</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <Button type="submit" className="w-full h-11 font-medium">
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
