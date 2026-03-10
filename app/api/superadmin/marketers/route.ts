import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { kstMonthRange } from "@/lib/utils";

// 마케터별 RS 정산 시작일 (없으면 전체 기간)
const RS_START_DATES: Record<string, string> = {
  양반: "2026-03-11T00:00:00+09:00",
};

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");

  const { data: admins, error } = await supabaseAdmin
    .from("admin_accounts")
    .select("id, name, rs_percentage")
    .order("name");

  if (error || !admins) {
    console.error("마케터 목록 조회 오류:", error);
    return NextResponse.json([]);
  }

  // 월별 필터링 범위
  let monthStart: string | null = null;
  let monthEnd: string | null = null;
  if (yearParam && monthParam) {
    const range = kstMonthRange(Number(yearParam), Number(monthParam));
    monthStart = range.startDate;
    monthEnd = range.endDate;
  }

  const result = await Promise.all(
    admins.map(async (admin) => {
      const { data: influencerIds } = await supabaseAdmin
        .from("influencers")
        .select("id")
        .eq("admin_id", admin.id);

      const ids = (influencerIds || []).map((i) => i.id);
      const rsStartDate = RS_START_DATES[admin.name] || null;

      if (ids.length === 0) {
        return { ...admin, filtered_revenue: 0, rs_start_date: rsStartDate };
      }

      // 시작일: rs_start_date와 월 시작일 중 더 늦은 날짜
      const effectiveStart = monthStart
        ? (rsStartDate && rsStartDate > monthStart ? rsStartDate : monthStart)
        : rsStartDate;

      // saju_analyses 매출
      let sajuQuery = supabaseAdmin
        .from("saju_analyses")
        .select("payment_info")
        .in("influencer_id", ids)
        .eq("is_paid", true)
        .eq("is_refunded", false);
      if (effectiveStart) sajuQuery = sajuQuery.gte("paid_at", effectiveStart);
      if (monthEnd) sajuQuery = sajuQuery.lt("paid_at", monthEnd);
      const { data: sajuPayments } = await sajuQuery;

      // face_analyses 매출
      let faceQuery = supabaseAdmin
        .from("face_analyses")
        .select("payment_info")
        .in("influencer_id", ids)
        .eq("is_paid", true)
        .eq("is_refunded", false);
      if (effectiveStart) faceQuery = faceQuery.gte("paid_at", effectiveStart);
      if (monthEnd) faceQuery = faceQuery.lt("paid_at", monthEnd);
      const { data: facePayments } = await faceQuery;

      const allPayments = [...(sajuPayments || []), ...(facePayments || [])];
      const filteredRevenue = allPayments.reduce((sum, p) => {
        const price =
          (p.payment_info as { price?: number } | null)?.price || 0;
        return sum + price;
      }, 0);

      return { ...admin, filtered_revenue: filteredRevenue, rs_start_date: rsStartDate };
    })
  );

  return NextResponse.json(result);
}
