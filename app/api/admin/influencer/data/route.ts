import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { kstMonthRange } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const influencerId = request.nextUrl.searchParams.get("influencer_id");
  const type = request.nextUrl.searchParams.get("type") || "summary";
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");

  if (!influencerId) {
    return NextResponse.json({ error: "influencer_id is required" }, { status: 400 });
  }

  try {
    if (type === "summary") {
      const [{ count: visitCount }, { data: sajuPayments }, { data: facePayments }] =
        await Promise.all([
          supabase.from("utm_visits").select("id", { count: "exact", head: true }).eq("influencer_id", influencerId),
          supabase.from("saju_analyses").select("payment_info").eq("influencer_id", influencerId).eq("is_paid", true).eq("is_refunded", false),
          supabase.from("face_analyses").select("payment_info").eq("influencer_id", influencerId).eq("is_paid", true).eq("is_refunded", false),
        ]);

      const allPayments = [...(sajuPayments || []), ...(facePayments || [])];
      const totalRevenue = allPayments.reduce((sum, p) => {
        const price = (p.payment_info as { price?: number } | null)?.price || 0;
        return sum + price;
      }, 0);

      return NextResponse.json({
        total_visits: visitCount || 0,
        total_payments: allPayments.length,
        total_revenue: totalRevenue,
      });
    }

    if (type === "settlement") {
      const now = new Date();
      const year = yearParam ? parseInt(yearParam) : now.getFullYear();
      const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;
      const { startDate, endDate } = kstMonthRange(year, month);

      const [{ count: visitCount }, { data: sajuPayments }, { data: facePayments }] =
        await Promise.all([
          supabase.from("utm_visits").select("id", { count: "exact", head: true }).eq("influencer_id", influencerId).gte("visited_at", startDate).lt("visited_at", endDate),
          supabase.from("saju_analyses").select("payment_info").eq("influencer_id", influencerId).eq("is_paid", true).eq("is_refunded", false).gte("paid_at", startDate).lt("paid_at", endDate),
          supabase.from("face_analyses").select("payment_info").eq("influencer_id", influencerId).eq("is_paid", true).eq("is_refunded", false).gte("paid_at", startDate).lt("paid_at", endDate),
        ]);

      const allPayments = [...(sajuPayments || []), ...(facePayments || [])];
      const totalRevenue = allPayments.reduce((sum, p) => {
        const price = (p.payment_info as { price?: number } | null)?.price || 0;
        return sum + price;
      }, 0);

      return NextResponse.json({
        year,
        month,
        visit_count: visitCount || 0,
        payment_count: allPayments.length,
        total_revenue: totalRevenue,
      });
    }

    if (type === "payments") {
      let sajuQuery = supabase
        .from("saju_analyses")
        .select("id, service_type, user_info, payment_info, paid_at, is_refunded")
        .eq("influencer_id", influencerId)
        .eq("is_paid", true);

      let faceQuery = supabase
        .from("face_analyses")
        .select("id, service_type, payment_info, paid_at, is_refunded")
        .eq("influencer_id", influencerId)
        .eq("is_paid", true);

      if (yearParam && monthParam) {
        const year = parseInt(yearParam);
        const month = parseInt(monthParam);
        const { startDate, endDate } = kstMonthRange(year, month);
        sajuQuery = sajuQuery.gte("paid_at", startDate).lt("paid_at", endDate);
        faceQuery = faceQuery.gte("paid_at", startDate).lt("paid_at", endDate);
      }

      const [{ data: sajuData }, { data: faceData }] = await Promise.all([
        sajuQuery.order("paid_at", { ascending: false }),
        faceQuery.order("paid_at", { ascending: false }),
      ]);

      const results: Array<{
        id: string;
        service_type: string;
        user_name: string;
        price: number;
        paid_at: string;
        is_refunded: boolean;
      }> = [];

      for (const row of sajuData || []) {
        const userInfo = row.user_info as { userName?: string } | null;
        const paymentInfo = row.payment_info as { price?: number } | null;
        results.push({
          id: row.id,
          service_type: row.service_type,
          user_name: userInfo?.userName || "-",
          price: paymentInfo?.price || 0,
          paid_at: row.paid_at,
          is_refunded: row.is_refunded || false,
        });
      }

      for (const row of faceData || []) {
        const paymentInfo = row.payment_info as { price?: number } | null;
        results.push({
          id: row.id,
          service_type: row.service_type,
          user_name: "-",
          price: paymentInfo?.price || 0,
          paid_at: row.paid_at,
          is_refunded: row.is_refunded || false,
        });
      }

      results.sort(
        (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
      );
      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (err) {
    console.error("Influencer data error:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
