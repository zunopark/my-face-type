import { supabase } from "@/lib/supabase";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  service_type: string;
  discount_type: string;
  discount_amount: number;
  total_quantity: number;
  remaining_quantity: number;
  is_active: boolean;
  created_at: string;
}

export interface CouponUsageLog {
  id: string;
  coupon_id: string | null;
  coupon_code: string;
  service_type: string;
  used_at: string;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  service_type: string;
  discount_type: string;
  discount_amount: number;
  total_quantity: number;
}

export interface UpdateCouponInput {
  code?: string;
  name?: string;
  service_type?: string;
  discount_type?: string;
  discount_amount?: number;
  total_quantity?: number;
  remaining_quantity?: number;
  is_active?: boolean;
}

// ─── 쿠폰 CRUD ─────────────────────────────────────

export async function getAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("쿠폰 목록 조회 오류:", error);
    return [];
  }
  return data || [];
}

export async function createCoupon(
  input: CreateCouponInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("coupons").insert({
    ...input,
    remaining_quantity: input.total_quantity,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "이미 존재하는 쿠폰 코드입니다." };
    }
    console.error("쿠폰 생성 오류:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateCoupon(
  id: string,
  input: UpdateCouponInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("coupons").update(input).eq("id", id);

  if (error) {
    console.error("쿠폰 수정 오류:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteCoupon(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("coupons").delete().eq("id", id);

  if (error) {
    console.error("쿠폰 삭제 오류:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function toggleCouponActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    console.error("쿠폰 상태 변경 오류:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ─── 쿠폰 검증 & 사용 ─────────────────────────────

export async function validateCoupon(
  code: string,
  serviceType: string
): Promise<{
  valid: boolean;
  coupon?: Coupon;
  error?: string;
}> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", code)
    .single();

  if (error || !data) {
    return { valid: false, error: "존재하지 않는 쿠폰 코드입니다." };
  }

  if (!data.is_active) {
    return { valid: false, error: "비활성화된 쿠폰입니다." };
  }

  if (data.remaining_quantity <= 0) {
    return { valid: false, error: "쿠폰이 모두 소진되었습니다." };
  }

  if (data.service_type !== "all" && data.service_type !== serviceType) {
    return { valid: false, error: "이 서비스에서 사용할 수 없는 쿠폰입니다." };
  }

  return { valid: true, coupon: data };
}

export async function useCoupon(
  code: string,
  serviceType: string
): Promise<{ success: boolean; error?: string }> {
  // Atomic decrement via RPC
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "use_coupon",
    { coupon_code: code }
  );

  if (rpcError) {
    console.error("use_coupon RPC 오류:", rpcError);
    // Fallback: manual decrement
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id, remaining_quantity")
      .ilike("code", code)
      .single();

    if (!coupon || coupon.remaining_quantity <= 0) {
      return { success: false, error: "쿠폰 사용에 실패했습니다." };
    }

    const { error: updateError } = await supabase
      .from("coupons")
      .update({ remaining_quantity: coupon.remaining_quantity - 1 })
      .eq("id", coupon.id);

    if (updateError) {
      return { success: false, error: "쿠폰 수량 차감에 실패했습니다." };
    }
  } else if (rpcResult === false) {
    return { success: false, error: "쿠폰 사용에 실패했습니다." };
  }

  // Log usage
  await logCouponUsage(code, serviceType);

  return { success: true };
}

// ─── 사용 내역 ─────────────────────────────────────

export async function logCouponUsage(
  code: string,
  serviceType: string
): Promise<void> {
  // Get coupon ID for the reference
  const { data: coupon } = await supabase
    .from("coupons")
    .select("id")
    .ilike("code", code)
    .single();

  const { error } = await supabase.from("coupon_usage_logs").insert({
    coupon_id: coupon?.id || null,
    coupon_code: code,
    service_type: serviceType,
  });

  if (error) {
    console.error("쿠폰 사용 로그 기록 오류:", error);
  }
}

export async function getCouponUsageLogs(
  couponCode?: string
): Promise<CouponUsageLog[]> {
  let query = supabase
    .from("coupon_usage_logs")
    .select("*")
    .order("used_at", { ascending: false });

  if (couponCode) {
    query = query.ilike("coupon_code", couponCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error("사용 내역 조회 오류:", error);
    return [];
  }
  return data || [];
}
