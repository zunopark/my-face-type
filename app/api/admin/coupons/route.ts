import { NextRequest, NextResponse } from "next/server";
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
} from "@/lib/db/couponDB";

// 전체 쿠폰 목록
export async function GET() {
  try {
    const coupons = await getAllCoupons();
    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("쿠폰 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 쿠폰 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, service_type, discount_type, discount_amount, total_quantity, expires_at } = body;

    if (!code || !name || !discount_type || !total_quantity) {
      return NextResponse.json(
        { success: false, error: "필수 항목을 모두 입력해주세요" },
        { status: 400 }
      );
    }

    const result = await createCoupon({
      code,
      name,
      service_type: service_type || "all",
      discount_type,
      discount_amount: discount_amount || 0,
      total_quantity,
      expires_at: expires_at || null,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error });
    }

    return NextResponse.json({ success: true, coupon: result.coupon });
  } catch (error) {
    console.error("쿠폰 생성 오류:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// 쿠폰 수정 / 토글 / 삭제
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "쿠폰 ID가 필요합니다" },
        { status: 400 }
      );
    }

    if (action === "toggle") {
      const result = await toggleCouponActive(id, data.is_active);
      return NextResponse.json(result);
    }

    const result = await updateCoupon(id, data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("쿠폰 수정 오류:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "쿠폰 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const result = await deleteCoupon(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("쿠폰 삭제 오류:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
