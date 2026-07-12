// actions/stripe.ts
"use server"

import Stripe from "stripe"
import { PlanType } from "@prisma/client"
import { headers } from "next/headers"
import { calculateCheckoutAmount } from "@/actions/subscription"
import { z } from "zod"

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY")
}

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
)

export async function createStripeCheckoutSession(shopId: string, plan: PlanType) {
    try {
        // Validate the incoming plan
        const planEnum = z.nativeEnum(PlanType).parse(plan)

        // 🌟 Rely EXCLUSIVELY on the central billing engine
        const { finalAmountToPay } = await calculateCheckoutAmount(shopId, planEnum)

        // Prevent Stripe call if amount is 0 (covered by prorate)
        if (finalAmountToPay <= 0) {
            throw new Error("ยอดชำระเป็น 0 บาท ไม่สามารถชำระผ่านบัตรได้")
        }

        const headersList = await headers()
        const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "http://localhost:3000"
        const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card", "promptpay"],
            line_items: [
                {
                    price_data: {
                        currency: "thb",
                        product_data: {
                            name: `Fixkub - ${planEnum.replace("_", " ")}`,
                        },
                        unit_amount: Math.round(finalAmountToPay * 100), // Convert Baht to Satang
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/checkout?shopId=${shopId}&plan=${planEnum}&cancel=true`,
            metadata: {
                shopId,
                plan: planEnum,
                expectedAmount: finalAmountToPay.toString(),
            },
        })

        if (!session.url) {
            throw new Error("Failed to generate checkout URL")
        }

        return { success: true, url: session.url }
    } catch (error: any) {
        console.error("Stripe session creation error:", error)
        return { success: false, error: error.message || "Failed to create Stripe session" }
    }
}