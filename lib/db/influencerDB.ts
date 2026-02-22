import { supabase } from "@/lib/supabase";

export interface Influencer {
  id: string;
  name: string;
  slug: string;
  platform: string;
  contact: string | null;
  memo: string | null;
  rs_percentage: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateInfluencerInput {
  name: string;
  slug: string;
  platform?: string;
  contact?: string;
  memo?: string;
  rs_percentage?: number;
}

export interface UpdateInfluencerInput {
  name?: string;
  slug?: string;
  platform?: string;
  contact?: string;
  memo?: string;
  rs_percentage?: number;
  is_active?: boolean;
}

export async function getAllInfluencers(): Promise<Influencer[]> {
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("인플루언서 목록 조회 오류:", error);
    return [];
  }
  return data || [];
}

export async function getInfluencerBySlug(
  slug: string
): Promise<Influencer | null> {
  const { data, error } = await supabase
    .from("influencers")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("인플루언서 조회 오류:", error);
    return null;
  }
  return data;
}

export async function createInfluencer(
  input: CreateInfluencerInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("influencers").insert(input);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "이미 존재하는 슬러그입니다." };
    }
    console.error("인플루언서 생성 오류:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateInfluencer(
  id: string,
  input: UpdateInfluencerInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("influencers")
    .update(input)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "이미 존재하는 슬러그입니다." };
    }
    console.error("인플루언서 수정 오류:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export interface InfluencerWithStats extends Influencer {
  total_visits: number;
  total_payments: number;
  total_revenue: number;
}

/**
 * 인플루언서 목록 + 누적 통계 (방문수, 결제건수, 매출)
 */
export async function getAllInfluencersWithStats(): Promise<InfluencerWithStats[]> {
  const { data: influencers, error } = await supabase
    .from("influencers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !influencers || influencers.length === 0) return [];

  const results: InfluencerWithStats[] = [];

  for (const inf of influencers) {
    const { count: visitCount } = await supabase
      .from("utm_visits")
      .select("id", { count: "exact", head: true })
      .eq("influencer_id", inf.id);

    const { data: sajuPayments } = await supabase
      .from("saju_analyses")
      .select("payment_info")
      .eq("influencer_id", inf.id)
      .eq("is_paid", true);

    const { data: facePayments } = await supabase
      .from("face_analyses")
      .select("payment_info")
      .eq("influencer_id", inf.id)
      .eq("is_paid", true);

    const allPayments = [...(sajuPayments || []), ...(facePayments || [])];
    const totalRevenue = allPayments.reduce((sum, p) => {
      const price = (p.payment_info as { price?: number } | null)?.price || 0;
      return sum + price;
    }, 0);

    results.push({
      ...inf,
      total_visits: visitCount || 0,
      total_payments: allPayments.length,
      total_revenue: totalRevenue,
    });
  }

  return results;
}

export async function deleteInfluencer(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("influencers").delete().eq("id", id);

  if (error) {
    console.error("인플루언서 삭제 오류:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
