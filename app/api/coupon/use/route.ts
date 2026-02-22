import { NextRequest, NextResponse } from "next/server";
import { useCoupon } from "@/lib/db/couponDB";

export async function POST(request: NextRequest) {
  const { code, serviceType } = await request.json();

  if (!code) {
    return NextResponse.json(
      { success: false, error: "쿠폰 코드가 필요합니다." },
      { status: 400 }
    );
  }

  const result = await useCoupon(code.trim(), serviceType || "unknown");

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
