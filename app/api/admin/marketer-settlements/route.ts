import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// GET: 마케터 정산 상태 조회
export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");
  const marketerId = request.nextUrl.searchParams.get("marketer_id");

  try {
    let query = supabase
      .from("marketer_settlements")
      .select("*");

    if (yearParam) query = query.eq("year", Number(yearParam));
    if (monthParam) query = query.eq("month", Number(monthParam));
    if (marketerId) query = query.eq("marketer_id", marketerId);

    const { data, error } = await query;

    if (error) {
      console.error("마케터 정산 조회 오류:", error);
      return NextResponse.json({ error: "마케터 정산 조회 실패" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: 마케터 정산 데이터 생성/업데이트 (upsert)
export async function POST(request: NextRequest) {
  try {
    const { marketer_id, year, month, amount, is_paid, memo } = await request.json();

    if (!marketer_id || !year || !month) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
    }

    const upsertData: Record<string, unknown> = {
      marketer_id,
      year,
      month,
      updated_at: new Date().toISOString(),
    };

    if (amount !== undefined) upsertData.amount = amount;
    if (memo !== undefined) upsertData.memo = memo;
    if (is_paid !== undefined) {
      upsertData.is_paid = is_paid;
      upsertData.paid_at = is_paid ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from("marketer_settlements")
      .upsert(upsertData, { onConflict: "marketer_id,year,month" })
      .select()
      .single();

    if (error) {
      console.error("마케터 정산 저장 오류:", error);
      return NextResponse.json({ error: "마케터 정산 저장 실패" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
