import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;

  const startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00`;

  try {
    const { data: sajuData } = await supabase
      .from("saju_analyses")
      .select("id, service_type, user_info, payment_info, paid_at, utm_source")
      .eq("is_paid", true)
      .gte("paid_at", startDate)
      .lt("paid_at", endDate)
      .order("paid_at", { ascending: false });

    const { data: faceData } = await supabase
      .from("face_analyses")
      .select("id, service_type, payment_info, paid_at, utm_source")
      .eq("is_paid", true)
      .gte("paid_at", startDate)
      .lt("paid_at", endDate)
      .order("paid_at", { ascending: false });

    // 인플루언서 slug → name 매핑
    const slugs = new Set<string>();
    for (const row of [...(sajuData || []), ...(faceData || [])]) {
      if (row.utm_source) slugs.add(row.utm_source);
    }
    const infMap = new Map<string, string>();
    if (slugs.size > 0) {
      const { data: infData } = await supabase
        .from("influencers")
        .select("slug, name")
        .in("slug", Array.from(slugs));
      for (const inf of infData || []) {
        infMap.set(inf.slug, inf.name);
      }
    }

    const results = [];

    for (const row of sajuData || []) {
      const userInfo = row.user_info as { userName?: string } | null;
      const paymentInfo = row.payment_info as {
        price?: number;
        couponCode?: string;
      } | null;
      results.push({
        id: row.id,
        service_type: row.service_type,
        user_name: userInfo?.userName || "-",
        price: paymentInfo?.price || 0,
        coupon_code: paymentInfo?.couponCode || null,
        influencer: infMap.get(row.utm_source) || null,
        paid_at: row.paid_at,
      });
    }

    for (const row of faceData || []) {
      const paymentInfo = row.payment_info as {
        price?: number;
        couponCode?: string;
      } | null;
      results.push({
        id: row.id,
        service_type: row.service_type,
        user_name: "-",
        price: paymentInfo?.price || 0,
        coupon_code: paymentInfo?.couponCode || null,
        influencer: infMap.get(row.utm_source) || null,
        paid_at: row.paid_at,
      });
    }

    // 리뷰 매칭
    const allIds = results.map((r) => r.id);
    const { data: reviewData } = await supabase
      .from("reviews")
      .select("record_id, rating, content")
      .in("record_id", allIds.length > 0 ? allIds : [""]);

    const reviewMap = new Map<string, { rating: number; content: string }>();
    for (const r of reviewData || []) {
      reviewMap.set(r.record_id, { rating: r.rating, content: r.content });
    }

    const final = results.map((r) => {
      const review = reviewMap.get(r.id);
      return {
        ...r,
        has_review: !!review,
        review_rating: review?.rating ?? null,
        review_content: review?.content ?? null,
      };
    });

    final.sort(
      (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
    );

    return NextResponse.json(final);
  } catch (error) {
    console.error("결제 내역 조회 오류:", error);
    return NextResponse.json(
      { error: "결제 내역 조회 실패" },
      { status: 500 }
    );
  }
}
