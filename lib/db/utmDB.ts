import { supabaseAdmin as supabase } from "@/lib/supabase";
import { getInfluencerBySlug } from "./influencerDB";
import { kstMonthRange } from "@/lib/utils";

export interface RecordVisitInput {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_page?: string;
}

export interface SettlementRow {
  influencer_id: string;
  influencer_name: string;
  slug: string;
  platform: string;
  visit_count: number;
  payment_count: number;
  total_revenue: number;
  rs_percentage: number;
  settlement_amount: number;
}

/**
 * UTM 방문 기록 저장
 * utm_source로 influencer_id를 자동 조회하여 연결
 */
export async function recordVisit(input: RecordVisitInput): Promise<boolean> {
  let influencer_id: string | null = null;

  if (input.utm_source) {
    const influencer = await getInfluencerBySlug(input.utm_source);
    if (influencer) {
      influencer_id = influencer.id;
    }
  }

  const { error } = await supabase.from("utm_visits").insert({
    utm_source: input.utm_source || null,
    utm_medium: input.utm_medium || null,
    utm_campaign: input.utm_campaign || null,
    influencer_id,
    landing_page: input.landing_page || null,
  });

  if (error) {
    console.error("UTM 방문 기록 오류:", error);
    return false;
  }
  return true;
}

/**
 * 월별 통계 데이터 조회
 */
export async function getMonthlySettlement(
  year: number,
  month: number,
  adminId?: string
): Promise<SettlementRow[]> {
  const { startDate, endDate } = kstMonthRange(year, month);

  // 1. 활성 인플루언서 목록
  let infQuery = supabase
    .from("influencers")
    .select("*")
    .order("name");

  if (adminId) {
    infQuery = infQuery.or(`admin_id.eq.${adminId},admin_id.is.null`);
  }

  const { data: influencers, error: infError } = await infQuery;

  if (infError || !influencers) {
    console.error("인플루언서 조회 오류:", infError);
    return [];
  }

  // 모든 인플루언서 데이터를 병렬로 조회
  const settled = await Promise.all(
    influencers.map(async (inf) => {
      const [{ count: visitCount }, { data: sajuPayments }, { data: facePayments }] =
        await Promise.all([
          supabase
            .from("utm_visits")
            .select("id", { count: "exact", head: true })
            .eq("influencer_id", inf.id)
            .gte("visited_at", startDate)
            .lt("visited_at", endDate),
          supabase
            .from("saju_analyses")
            .select("payment_info")
            .eq("influencer_id", inf.id)
            .eq("is_paid", true)
            .eq("is_refunded", false)
            .gte("paid_at", startDate)
            .lt("paid_at", endDate),
          supabase
            .from("face_analyses")
            .select("payment_info")
            .eq("influencer_id", inf.id)
            .eq("is_paid", true)
            .eq("is_refunded", false)
            .gte("paid_at", startDate)
            .lt("paid_at", endDate),
        ]);

      const allPayments = [...(sajuPayments || []), ...(facePayments || [])];
      const paymentCount = allPayments.length;
      const totalRevenue = allPayments.reduce((sum, p) => {
        const price = (p.payment_info as { price?: number } | null)?.price || 0;
        return sum + price;
      }, 0);

      const rsPercentage = Number(inf.rs_percentage);
      const settlementAmount = Math.round(totalRevenue * rsPercentage / 100);

      if (visitCount || paymentCount > 0) {
        return {
          influencer_id: inf.id,
          influencer_name: inf.name,
          slug: inf.slug,
          platform: inf.platform,
          visit_count: visitCount || 0,
          payment_count: paymentCount,
          total_revenue: totalRevenue,
          rs_percentage: rsPercentage,
          settlement_amount: settlementAmount,
        } as SettlementRow;
      }
      return null;
    })
  );

  return settled.filter((r): r is SettlementRow => r !== null);
}

export interface PaymentDetail {
  id: string;
  service_type: string;
  user_name: string;
  price: number;
  paid_at: string;
  is_refunded: boolean;
}

/**
 * 인플루언서별 결제 내역 조회
 */
export async function getPaymentsByInfluencer(
  influencerId: string
): Promise<PaymentDetail[]> {
  const { data: sajuData } = await supabase
    .from("saju_analyses")
    .select("id, service_type, user_info, payment_info, paid_at, is_refunded")
    .eq("influencer_id", influencerId)
    .eq("is_paid", true)
    .order("paid_at", { ascending: false });

  const { data: faceData } = await supabase
    .from("face_analyses")
    .select("id, service_type, payment_info, paid_at, is_refunded")
    .eq("influencer_id", influencerId)
    .eq("is_paid", true)
    .order("paid_at", { ascending: false });

  const results: PaymentDetail[] = [];

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

  results.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  return results;
}
