import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// GET: List discounts for an influencer
export async function GET(request: NextRequest) {
  const influencerId = request.nextUrl.searchParams.get("influencer_id");
  if (!influencerId) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("influencer_discounts")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("service_type");

  if (error) {
    console.error("할인 목록 조회 오류:", error);
    return NextResponse.json([]);
  }
  return NextResponse.json(data || []);
}

// POST: Create or update (upsert) a discount for an influencer + service_type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { influencer_id, service_type, discount_code, discount_start_at, discount_end_at } = body;

    if (!influencer_id || !service_type || !discount_code) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
    }

    const { error } = await supabase
      .from("influencer_discounts")
      .upsert(
        {
          influencer_id,
          service_type,
          discount_code,
          discount_start_at: discount_start_at || null,
          discount_end_at: discount_end_at || null,
        },
        { onConflict: "influencer_id,service_type" }
      );

    if (error) {
      console.error("할인 저장 오류:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "요청 처리 실패" }, { status: 500 });
  }
}

// DELETE: Remove a discount by id
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("influencer_discounts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("할인 삭제 오류:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
