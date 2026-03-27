import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 🌟 เปลี่ยนมาใช้ createBrowserClient เพื่อให้ระบบคุยกับ SSR และ Middleware รู้เรื่อง
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)