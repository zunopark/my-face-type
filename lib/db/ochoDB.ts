import { supabaseAdmin as supabase } from "@/lib/supabase";

// ─── 타입 정의 ───

export interface OchoAffiliate {
  id: string;
  external_id: string;
  campaign_id: string;
  email: string;
  name: string;
  platform: string | null;
  handle: string | null;
  followers: number | null;
  profile_url: string | null;
  status: string;
  metadata: Record<string, unknown>;
  credentials: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OchoTrial {
  id: string;
  affiliate_id: string;
  campaign_id: string;
  plan: string;
  duration_days: number | null;
  usage_limit: number | null;
  usage_used: number;
  auto_convert: boolean;
  status: string;
  activation_type: string;
  access_url: string | null;
  coupon_code: string | null;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface OchoReferral {
  id: string;
  affiliate_id: string;
  campaign_id: string;
  product_id: string;
  platform: string;
  tracking_type: string;
  code: string | null;
  links_by_platform: Record<string, Array<{ product: string; url: string }>>;
  commission_type: string;
  commission_value: number;
  discount_type: string | null;
  discount_value: number | null;
  status: string;
  created_at: string;
}

export interface OchoReferralStats {
  referral_id: string;
  revenue: number;
  commission_earned: number;
  currency: string;
}

// ─── 멱등성 ───

export async function getIdempotencyResponse(
  requestId: string,
  campaignId: string
): Promise<{ status: number; body: unknown } | null> {
  const { data } = await supabase
    .from("ocho_idempotency_log")
    .select("response_status, response_body")
    .eq("request_id", requestId)
    .eq("campaign_id", campaignId)
    .single();

  if (!data) return null;
  return { status: data.response_status, body: data.response_body };
}

export async function saveIdempotencyResponse(
  requestId: string,
  campaignId: string,
  status: number,
  body: unknown
) {
  await supabase.from("ocho_idempotency_log").upsert({
    request_id: requestId,
    campaign_id: campaignId,
    response_status: status,
    response_body: body,
  });
}

// ─── 어필리에이트 ───

export async function createAffiliate(
  data: {
    external_id: string;
    campaign_id: string;
    email: string;
    name: string;
    platform?: string;
    handle?: string;
    followers?: number;
    profile_url?: string;
    metadata?: Record<string, unknown>;
    credentials?: Record<string, unknown> | null;
  }
): Promise<{ success: true; affiliate: OchoAffiliate } | { success: false; error: string; existing?: OchoAffiliate }> {
  // 중복 체크
  const { data: existing } = await supabase
    .from("ocho_affiliates")
    .select("*")
    .eq("external_id", data.external_id)
    .eq("campaign_id", data.campaign_id)
    .single();

  if (existing) {
    return { success: false, error: "affiliate_already_exists", existing: existing as OchoAffiliate };
  }

  const { data: created, error } = await supabase
    .from("ocho_affiliates")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("어필리에이트 생성 오류:", error);
    return { success: false, error: error.message };
  }

  return { success: true, affiliate: created as OchoAffiliate };
}

export async function getAffiliate(
  affiliateId: string,
  campaignId: string
): Promise<OchoAffiliate | null> {
  const { data } = await supabase
    .from("ocho_affiliates")
    .select("*")
    .eq("id", affiliateId)
    .eq("campaign_id", campaignId)
    .single();

  return data as OchoAffiliate | null;
}

export async function updateAffiliate(
  affiliateId: string,
  campaignId: string,
  updates: Record<string, unknown>
): Promise<OchoAffiliate | null> {
  const { data, error } = await supabase
    .from("ocho_affiliates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", affiliateId)
    .eq("campaign_id", campaignId)
    .select()
    .single();

  if (error) {
    console.error("어필리에이트 수정 오류:", error);
    return null;
  }

  return data as OchoAffiliate;
}

// ─── 트라이얼 ───

export async function createTrial(
  data: {
    affiliate_id: string;
    campaign_id: string;
    plan: string;
    duration_days?: number | null;
    usage_limit?: number | null;
    auto_convert?: boolean;
    activation_type: string;
    access_url?: string;
    coupon_code?: string;
    starts_at: string;
    expires_at?: string | null;
  }
): Promise<OchoTrial | null> {
  const { data: created, error } = await supabase
    .from("ocho_trials")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("트라이얼 생성 오류:", error);
    return null;
  }

  return created as OchoTrial;
}

export async function getTrial(
  trialId: string,
  affiliateId: string,
  campaignId: string
): Promise<OchoTrial | null> {
  const { data } = await supabase
    .from("ocho_trials")
    .select("*")
    .eq("id", trialId)
    .eq("affiliate_id", affiliateId)
    .eq("campaign_id", campaignId)
    .single();

  return data as OchoTrial | null;
}

export async function updateTrial(
  trialId: string,
  affiliateId: string,
  campaignId: string,
  updates: Record<string, unknown>
): Promise<OchoTrial | null> {
  const { data, error } = await supabase
    .from("ocho_trials")
    .update(updates)
    .eq("id", trialId)
    .eq("affiliate_id", affiliateId)
    .eq("campaign_id", campaignId)
    .select()
    .single();

  if (error) {
    console.error("트라이얼 수정 오류:", error);
    return null;
  }

  return data as OchoTrial;
}

// ─── 레퍼럴 ───

export async function createReferral(
  data: {
    affiliate_id: string;
    campaign_id: string;
    product_id: string;
    platform: string;
    tracking_type: string;
    code?: string;
    links_by_platform: Record<string, Array<{ product: string; url: string }>>;
    commission_type: string;
    commission_value: number;
    discount_type?: string;
    discount_value?: number;
  }
): Promise<OchoReferral | null> {
  const { data: created, error } = await supabase
    .from("ocho_referrals")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("레퍼럴 생성 오류:", error);
    return null;
  }

  // 통계 레코드도 같이 생성
  await supabase.from("ocho_referral_stats").insert({
    referral_id: created.id,
    revenue: 0,
    commission_earned: 0,
    currency: "KRW",
  });

  return created as OchoReferral;
}

export async function getReferralStats(
  referralId: string,
  affiliateId: string,
  campaignId: string
): Promise<OchoReferralStats | null> {
  // 레퍼럴이 해당 캠페인 소속인지 확인
  const { data: referral } = await supabase
    .from("ocho_referrals")
    .select("id")
    .eq("id", referralId)
    .eq("affiliate_id", affiliateId)
    .eq("campaign_id", campaignId)
    .single();

  if (!referral) return null;

  const { data } = await supabase
    .from("ocho_referral_stats")
    .select("referral_id, revenue, commission_earned, currency")
    .eq("referral_id", referralId)
    .single();

  return data as OchoReferralStats | null;
}
