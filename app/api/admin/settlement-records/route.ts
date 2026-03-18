import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// GET: 정산 기록 조회
export async function GET(request: NextRequest) {
  const targetType = request.nextUrl.searchParams.get("target_type");
  const targetId = request.nextUrl.searchParams.get("target_id");

  try {
    let query = supabase
      .from("settlement_records")
      .select("*")
      .order("settled_at", { ascending: false });

    if (targetType) query = query.eq("target_type", targetType);
    if (targetId) query = query.eq("target_id", targetId);

    const { data, error } = await query;

    if (error) {
      console.error("정산 기록 조회 오류:", error);
      return NextResponse.json({ error: "정산 기록 조회 실패" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST: 정산 기록 추가
export async function POST(request: NextRequest) {
  try {
    const { target_type, target_id, amount, memo, settled_at } = await request.json();

    if (!target_type || !target_id || amount === undefined) {
      return NextResponse.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      target_type,
      target_id,
      amount,
    };
    if (memo) insertData.memo = memo;
    if (settled_at) insertData.settled_at = settled_at;

    const { data, error } = await supabase
      .from("settlement_records")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("정산 기록 추가 오류:", error);
      return NextResponse.json({ error: "정산 기록 추가 실패" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// PATCH: 정산 기록 수정
export async function PATCH(request: NextRequest) {
  try {
    const { id, amount, memo, settled_at } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (amount !== undefined) updateData.amount = amount;
    if (memo !== undefined) updateData.memo = memo;
    if (settled_at !== undefined) updateData.settled_at = settled_at;

    const { data, error } = await supabase
      .from("settlement_records")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("정산 기록 수정 오류:", error);
      return NextResponse.json({ error: "정산 기록 수정 실패" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// DELETE: 정산 기록 삭제
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("settlement_records")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("정산 기록 삭제 오류:", error);
      return NextResponse.json({ error: "정산 기록 삭제 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
