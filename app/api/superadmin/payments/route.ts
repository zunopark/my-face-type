import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { kstMonthRange } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;

  const { startDate, endDate } = kstMonthRange(year, month);

  try {
    // 1) saju + face 쿼리 병렬 실행
    const [{ data: sajuData }, { data: faceData }] = await Promise.all([
      supabase
        .from("saju_analyses")
        .select("id, service_type, user_info, payment_info, paid_at, utm_source, influencer_id, is_refunded, refunded_at")
        .eq("is_paid", true)
        .gte("paid_at", startDate)
        .lt("paid_at", endDate)
        .order("paid_at", { ascending: false }),
      supabase
        .from("face_analyses")
        .select("id, service_type, payment_info, paid_at, utm_source, is_refunded, refunded_at")
        .eq("is_paid", true)
        .gte("paid_at", startDate)
        .lt("paid_at", endDate)
        .order("paid_at", { ascending: false }),
    ]);

    // 2) 결과 조합 + 인플루언서 slug 수집
    const results = [];
    const slugs = new Set<string>();

    const influencerIds = new Set<string>();

    for (const row of sajuData || []) {
      const userInfo = row.user_info as { userName?: string; wish2026?: string; userConcern?: string } | null;
      const paymentInfo = row.payment_info as { price?: number; couponCode?: string } | null;
      if (row.utm_source) slugs.add(row.utm_source);
      if (row.influencer_id) influencerIds.add(row.influencer_id);
      results.push({
        id: row.id,
        service_type: row.service_type,
        user_name: userInfo?.userName || "-",
        wish: userInfo?.wish2026 || userInfo?.userConcern || null,
        price: paymentInfo?.price || 0,
        coupon_code: paymentInfo?.couponCode || null,
        utm_source: row.utm_source,
        influencer_id: row.influencer_id || null,
        paid_at: row.paid_at,
        is_refunded: row.is_refunded || false,
        refunded_at: row.refunded_at || null,
        table: "saju_analyses" as const,
      });
    }

    for (const row of faceData || []) {
      const paymentInfo = row.payment_info as { price?: number; couponCode?: string } | null;
      if (row.utm_source) slugs.add(row.utm_source);
      results.push({
        id: row.id,
        service_type: row.service_type,
        user_name: "-",
        wish: null,
        price: paymentInfo?.price || 0,
        coupon_code: paymentInfo?.couponCode || null,
        utm_source: row.utm_source,
        influencer_id: null,
        paid_at: row.paid_at,
        is_refunded: row.is_refunded || false,
        refunded_at: row.refunded_at || null,
        table: "face_analyses" as const,
      });
    }

    // 3) 인플루언서 + 리뷰 배치 병렬 조회
    const allIds = results.map((r) => r.id);
    const BATCH_SIZE = 50;

    const [infMap, reviewMap] = await Promise.all([
      // 인플루언서 (slug + id 모두 조회)
      (async () => {
        const slugMap = new Map<string, string>();
        const idMap = new Map<string, string>();
        const queries = [];
        if (slugs.size > 0) {
          queries.push(
            supabase.from("influencers").select("id, slug, name").in("slug", Array.from(slugs))
          );
        }
        if (influencerIds.size > 0) {
          queries.push(
            supabase.from("influencers").select("id, slug, name").in("id", Array.from(influencerIds))
          );
        }
        const results = await Promise.all(queries);
        for (const { data } of results) {
          for (const inf of data || []) {
            slugMap.set(inf.slug, inf.name);
            idMap.set(inf.id, inf.name);
          }
        }
        return { slugMap, idMap };
      })(),
      // 리뷰 (배치 병렬)
      (async () => {
        const map = new Map<string, { rating: number; content: string }>();
        if (allIds.length === 0) return map;
        const batches = [];
        for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
          batches.push(allIds.slice(i, i + BATCH_SIZE));
        }
        const batchResults = await Promise.all(
          batches.map((batch) =>
            supabase.from("reviews").select("record_id, rating, content").in("record_id", batch)
          )
        );
        for (const { data } of batchResults) {
          for (const r of data || []) map.set(r.record_id, { rating: r.rating, content: r.content });
        }
        return map;
      })(),
    ]);

    // 4) 최종 조합
    const { slugMap, idMap } = infMap;
    const final = results.map((r) => {
      const review = reviewMap.get(r.id);
      return {
        id: r.id,
        service_type: r.service_type,
        user_name: r.user_name,
        wish: r.wish,
        price: r.price,
        coupon_code: r.coupon_code,
        influencer: slugMap.get(r.utm_source) || (r.influencer_id ? idMap.get(r.influencer_id) : null) || null,
        paid_at: r.paid_at,
        is_refunded: r.is_refunded,
        refunded_at: r.refunded_at,
        table: r.table,
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

export async function POST(request: NextRequest) {
  try {
    const { id, table, action } = await request.json();

    if (!id || !table) {
      return NextResponse.json({ error: "id와 table은 필수입니다." }, { status: 400 });
    }

    if (table !== "saju_analyses" && table !== "face_analyses") {
      return NextResponse.json({ error: "올바르지 않은 테이블입니다." }, { status: 400 });
    }

    const updateData = action === "cancel_refund"
      ? { is_refunded: false, refunded_at: null }
      : { is_refunded: true, refunded_at: new Date().toISOString() };

    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("환불 처리 오류:", error);
      return NextResponse.json({ error: "환불 처리 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("환불 처리 오류:", error);
    return NextResponse.json({ error: "환불 처리 실패" }, { status: 500 });
  }
}
