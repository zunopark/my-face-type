import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/db/couponDB";

export async function POST(request: NextRequest) {
  const { code, serviceType } = await request.json();

  if (!code) {
    return NextResponse.json(
      { valid: false, error: "쿠폰 코드를 입력해주세요." },
      { status: 400 }
    );
  }

  const result = await validateCoupon(code.trim(), serviceType || "all");

  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error });
  }

  const coupon = result.coupon!;
  return NextResponse.json({
    valid: true,
    discount_type: coupon.discount_type,
    discount_amount: coupon.discount_amount,
    is_free: coupon.discount_type === "free",
  });
}
