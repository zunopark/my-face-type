import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// POST: 인플루언서 순서 변경
export async function POST(request: NextRequest) {
  try {
    const { order } = await request.json();

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order 배열이 필요합니다." }, { status: 400 });
    }

    // order: [{ id: string, sort_order: number }]
    for (const item of order) {
      await supabase
        .from("influencers")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
