import { NextRequest, NextResponse } from "next/server";
import { useCoupon } from "@/lib/db/couponDB";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "쿠폰 코드가 필요합니다" },
        { status: 400 }
      );
    }

    const result = await useCoupon(code.trim());

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("쿠폰 사용 오류:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
