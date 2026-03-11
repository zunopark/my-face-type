import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const serviceType = request.nextUrl.searchParams.get("serviceType");

  if (!slug || !serviceType) {
    return NextResponse.json({ hasDiscount: false });
  }

  // 1. 인플루언서 조회
  const { data: influencer } = await supabase
    .from("influencers")
    .select("id, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!influencer) {
    return NextResponse.json({ hasDiscount: false });
  }

  // 2. 서비스별 할인 설정 조회
  const { data: discount } = await supabase
    .from("influencer_discounts")
    .select("*")
    .eq("influencer_id", influencer.id)
    .eq("service_type", serviceType)
    .single();

  if (!discount) {
    return NextResponse.json({ hasDiscount: false });
  }

  // 3. 기간 체크
  const now = new Date();
  if (discount.discount_start_at && new Date(discount.discount_start_at) > now) {
    return NextResponse.json({ hasDiscount: false });
  }
  if (discount.discount_end_at && new Date(discount.discount_end_at) < now) {
    return NextResponse.json({ hasDiscount: false });
  }

  // 4. 쿠폰 유효성 확인
  const { data: coupon } = await supabase
    .from("coupons")
    .select("*")
    .ilike("code", discount.discount_code)
    .single();

  if (!coupon || !coupon.is_active || coupon.remaining_quantity <= 0) {
    return NextResponse.json({ hasDiscount: false });
  }

  // 5. 서비스 타입 체크 (쿠폰이 all이 아니면 매칭 확인)
  if (coupon.service_type !== "all" && coupon.service_type !== serviceType) {
    return NextResponse.json({ hasDiscount: false });
  }

  return NextResponse.json({
    hasDiscount: true,
    discount_type: coupon.discount_type,
    discount_amount: coupon.discount_amount,
    discount_code: coupon.code,
    is_free: coupon.discount_type === "free",
    influencer_name: influencer.name,
  });
}
