import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 匿名設計のためセッション永続化は不要
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: false },
});

// 注意: assessments への書き込みは .select() を付けないこと（RLS: anonにSELECT無し）
// 挿入IDが必要な処理は RPC submit_assessment を使う（仕様書§6）
