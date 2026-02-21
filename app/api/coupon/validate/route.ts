import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/db/couponDB";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, serviceType } = body;

    if (!code || !serviceType) {
      return NextResponse.json(
        { valid: false, error: "쿠폰 코드와 서비스 타입이 필요합니다" },
        { status: 400 }
      );
    }

    const result = await validateCoupon(code.trim(), serviceType);

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
  } catch (error) {
    console.error("쿠폰 검증 오류:", error);
    return NextResponse.json(
      { valid: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
