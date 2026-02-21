import { supabase } from "@/lib/supabase";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  service_type: string; // face | couple | saju_love | new_year | all
  discount_type: string; // free | fixed
  discount_amount: number;
  total_quantity: number;
  remaining_quantity: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  service_type: string;
  discount_type: string;
  discount_amount: number;
  total_quantity: number;
  expires_at?: string | null;
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
  expires_at?: string | null;
}

/**
 * 쿠폰 코드 유효성 검증
 */
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
    return { valid: false, error: "존재하지 않는 쿠폰입니다" };
  }

  const coupon = data as Coupon;

  if (!coupon.is_active) {
    return { valid: false, error: "비활성화된 쿠폰입니다" };
  }

  if (coupon.remaining_quantity <= 0) {
    return { valid: false, error: "쿠폰이 모두 소진되었습니다" };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "만료된 쿠폰입니다" };
  }

  if (coupon.service_type !== "all" && coupon.service_type !== serviceType) {
    return { valid: false, error: "이 서비스에서 사용할 수 없는 쿠폰입니다" };
  }

  return { valid: true, coupon };
}

/**
 * 쿠폰 사용 (remaining_quantity - 1, atomic update)
 */
export async function useCoupon(code: string): Promise<{ success: boolean; error?: string }> {
  // Atomic update: remaining_quantity > 0인 경우에만 차감
  const { data, error } = await supabase.rpc("use_coupon", {
    coupon_code: code,
  });

  if (error) {
    // RPC가 없을 경우 fallback: 직접 업데이트
    const { data: coupon } = await supabase
      .from("coupons")
      .select("remaining_quantity")
      .ilike("code", code)
      .single();

    if (!coupon || coupon.remaining_quantity <= 0) {
      return { success: false, error: "쿠폰이 모두 소진되었습니다" };
    }

    const { error: updateError } = await supabase
      .from("coupons")
      .update({ remaining_quantity: coupon.remaining_quantity - 1 })
      .ilike("code", code)
      .gt("remaining_quantity", 0);

    if (updateError) {
      return { success: false, error: "쿠폰 사용 처리 실패" };
    }

    return { success: true };
  }

  if (data === false) {
    return { success: false, error: "쿠폰이 모두 소진되었습니다" };
  }

  return { success: true };
}

/**
 * 전체 쿠폰 목록 (대시보드용)
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("쿠폰 목록 조회 실패:", error);
    return [];
  }

  return (data as Coupon[]) || [];
}

/**
 * 쿠폰 생성
 */
export async function createCoupon(
  input: CreateCouponInput
): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: input.code,
      name: input.name,
      service_type: input.service_type,
      discount_type: input.discount_type,
      discount_amount: input.discount_amount,
      total_quantity: input.total_quantity,
      remaining_quantity: input.total_quantity,
      is_active: true,
      expires_at: input.expires_at || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "이미 존재하는 쿠폰 코드입니다" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, coupon: data as Coupon };
}

/**
 * 쿠폰 수정
 */
export async function updateCoupon(
  id: string,
  input: UpdateCouponInput
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("coupons")
    .update(input)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 쿠폰 삭제
 */
export async function deleteCoupon(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 쿠폰 활성/비활성 토글
 */
export async function toggleCouponActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
