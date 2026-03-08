"use client"

import { useState } from "react"
import { Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate sending magic link
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
    setIsSent(true)
    // For demo purposes, auto-login after 2 seconds
    setTimeout(() => {
      onLogin()
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold">Shop Owner Login</CardTitle>
          <CardDescription className="text-base">
            Sign in to manage your queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Check your email</h3>
              <p className="text-muted-foreground">
                {"We've sent a magic link to"} <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email Address</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </Field>
              </FieldGroup>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Magic Link
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                No password needed. {"We'll send a secure login link to your email."}
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
