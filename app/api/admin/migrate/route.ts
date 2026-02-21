import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: "public" },
    });

    // Check if table exists by trying to query it
    const { error: checkError } = await supabase
      .from("coupons")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "PGRST205") {
      // Table doesn't exist - we can't create it via REST API
      // Return the SQL for manual execution
      return NextResponse.json({
        exists: false,
        message: "Table does not exist. Please run the SQL in Supabase Dashboard.",
        sql: `CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'all',
  discount_type TEXT NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);`,
      });
    }

    if (checkError) {
      return NextResponse.json({ exists: false, error: checkError.message });
    }

    return NextResponse.json({ exists: true, message: "Table already exists" });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
