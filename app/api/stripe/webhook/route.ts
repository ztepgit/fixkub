// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { processPaymentSuccess } from "@/actions/subscription"
import { db } from "@/lib/prisma"

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
    try {
        const body = await req.text()
        const signature = req.headers.get("stripe-signature")

        if (!signature || !webhookSecret) {
            return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
        }

        let event: Stripe.Event

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`)
            return NextResponse.json({ error: "Webhook Error" }, { status: 400 })
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session

            const shopId = session.metadata?.shopId
            const planEnum = session.metadata?.plan
            const expectedAmountStr = session.metadata?.expectedAmount
            const amountTotalSatang = session.amount_total
            const sessionId = session.id

            if (!shopId || !planEnum || amountTotalSatang === null) {
                console.error("Missing metadata or amount in session:", session.id)
                return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
            }

            // 🌟 Convert Satang back to Baht
            const amountBaht = amountTotalSatang / 100

            // 🌟 Security verification: Ensure the paid amount matches what the engine calculated
            if (
                expectedAmountStr &&
                Math.abs(amountBaht - parseFloat(expectedAmountStr)) > 0.01
            ) {
                console.error(`Amount mismatch for session ${sessionId}. Expected: ${expectedAmountStr}, Paid: ${amountBaht}`)
                return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
            }

            // Idempotency Check using the existing logic
            const existingTransaction = await db.paymentTransaction.findUnique({
                where: { transRef: sessionId }
            })

            if (existingTransaction && existingTransaction.status === "APPROVED") {
                console.log(`Transaction ${sessionId} already processed.`)
                return NextResponse.json({ received: true, message: "Already processed" })
            }

            // Route to existing billing engine (isWebhook = true)
            const result = await processPaymentSuccess(
                shopId,
                planEnum,
                amountBaht,
                sessionId,
                true
            )

            if (!result.success) {
                console.error("Failed to process payment success:", result.error)
                if (result.message === "รายการถูกอนุมัติไปแล้วก่อนหน้านี้") {
                    return NextResponse.json({ received: true, message: "Already processed internally" })
                }
                return NextResponse.json({ error: result.error }, { status: 500 })
            }
        }

        return NextResponse.json({ received: true })

    } catch (err: any) {
        console.error("Stripe Webhook Handler Error:", err)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}