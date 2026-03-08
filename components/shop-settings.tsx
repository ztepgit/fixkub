"use client"

import { Copy, Download, Settings, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useState } from "react"

interface ShopSettingsProps {
  displayName: string
  shopSlug: string
  onDisplayNameChange: (name: string) => void
}

export function ShopSettings({ displayName, shopSlug, onDisplayNameChange }: ShopSettingsProps) {
  const [copied, setCopied] = useState(false)
  const shopLink = `${shopSlug}.esyq.com`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`https://${shopLink}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    // In a real app, this would generate and download a QR code
    alert("QR Code download started! (Demo only)")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Settings className="w-5 h-5" />
          Shop Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="display-name">Display Name</FieldLabel>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              className="h-11"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="shop-link">Shop System Link</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="shop-link"
                value={shopLink}
                readOnly
                disabled
                className="h-11 bg-muted font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={handleCopy}
                aria-label="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </Field>
        </FieldGroup>

        <Button 
          variant="secondary" 
          className="w-full h-11 font-medium"
          onClick={handleDownloadQR}
        >
          <Download className="w-5 h-5 mr-2" />
          Download Storefront QR Code
        </Button>
      </CardContent>
    </Card>
  )
}
