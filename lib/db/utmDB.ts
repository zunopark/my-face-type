import { supabase } from "@/lib/supabase";
import { getInfluencerBySlug } from "./influencerDB";

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
 * 월별 정산 데이터 조회
 */
export async function getMonthlySettlement(
  year: number,
  month: number
): Promise<SettlementRow[]> {
  // 해당 월의 시작/끝 날짜
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 1).toISOString();

  // 1. 활성 인플루언서 목록
  const { data: influencers, error: infError } = await supabase
    .from("influencers")
    .select("*")
    .order("name");

  if (infError || !influencers) {
    console.error("인플루언서 조회 오류:", infError);
    return [];
  }

  const results: SettlementRow[] = [];

  for (const inf of influencers) {
    // 2. 방문수
    const { count: visitCount } = await supabase
      .from("utm_visits")
      .select("id", { count: "exact", head: true })
      .eq("influencer_id", inf.id)
      .gte("visited_at", startDate)
      .lt("visited_at", endDate);

    // 3. 사주 결제 건수 및 매출
    const { data: sajuPayments } = await supabase
      .from("saju_analyses")
      .select("payment_info")
      .eq("influencer_id", inf.id)
      .eq("is_paid", true)
      .gte("paid_at", startDate)
      .lt("paid_at", endDate);

    // 4. 관상 결제 건수 및 매출
    const { data: facePayments } = await supabase
      .from("face_analyses")
      .select("payment_info")
      .eq("influencer_id", inf.id)
      .eq("is_paid", true)
      .gte("paid_at", startDate)
      .lt("paid_at", endDate);

    const allPayments = [...(sajuPayments || []), ...(facePayments || [])];
    const paymentCount = allPayments.length;
    const totalRevenue = allPayments.reduce((sum, p) => {
      const price =
        (p.payment_info as { price?: number } | null)?.price || 0;
      return sum + price;
    }, 0);

    const rsPercentage = Number(inf.rs_percentage);
    const settlementAmount = Math.round(totalRevenue * rsPercentage / 100);

    if (visitCount || paymentCount > 0) {
      results.push({
        influencer_id: inf.id,
        influencer_name: inf.name,
        slug: inf.slug,
        platform: inf.platform,
        visit_count: visitCount || 0,
        payment_count: paymentCount,
        total_revenue: totalRevenue,
        rs_percentage: rsPercentage,
        settlement_amount: settlementAmount,
      });
    }
  }

  return results;
}

export interface PaymentDetail {
  id: string;
  service_type: string;
  user_name: string;
  price: number;
  paid_at: string;
}

/**
 * 인플루언서별 결제 내역 조회
 */
export async function getPaymentsByInfluencer(
  influencerId: string
): Promise<PaymentDetail[]> {
  const { data: sajuData } = await supabase
    .from("saju_analyses")
    .select("id, service_type, user_info, payment_info, paid_at")
    .eq("influencer_id", influencerId)
    .eq("is_paid", true)
    .order("paid_at", { ascending: false });

  const { data: faceData } = await supabase
    .from("face_analyses")
    .select("id, service_type, payment_info, paid_at")
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
    });
  }

  results.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  return results;
}
