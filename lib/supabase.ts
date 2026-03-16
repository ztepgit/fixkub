import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// สร้างตัวแทน Supabase ไว้คุยงานฝั่งหน้าบ้าน (Client)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)