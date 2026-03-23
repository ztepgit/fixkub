import { z } from "zod"

export const createShopSchema = z.object({
  name: z.string().min(2, "ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร"),
  slug: z.string()
    .min(3, "Slug ต้องมีอย่างน้อย 3 ตัวอักษร")
    .regex(/^[a-z0-9-]+$/, "Slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข หรือขีดกลาง (-) เท่านั้น"),
  logoUrl: z.string().url("รูปแบบ URL ไม่ถูกต้อง").optional().or(z.literal("")),
  themeColor: z.string().default("#10b981"),
  ownerEmail: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  planType: z.enum([
    "FREE_TRIAL", "BASIC_MONTHLY", "BASIC_YEARLY", 
    "PRO_MONTHLY", "PRO_YEARLY", "LIFETIME"
  ]),
  trialDays: z.coerce.number().min(0).max(90).default(30),
  startImmediately: z.boolean().default(false),
  agentCode: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true)
})

export type CreateShopInput = z.infer<typeof createShopSchema>