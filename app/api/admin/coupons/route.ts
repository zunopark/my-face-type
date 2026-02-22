import { NextRequest, NextResponse } from "next/server";
import {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
  getCouponUsageLogs,
} from "@/lib/db/couponDB";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "usage_logs") {
    const couponCode = searchParams.get("coupon_code") || undefined;
    const logs = await getCouponUsageLogs(couponCode);
    return NextResponse.json(logs);
  }

  const coupons = await getAllCoupons();
  return NextResponse.json(coupons);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code, name, discount_type, total_quantity } = body;

  if (!code || !name || !discount_type || !total_quantity) {
    return NextResponse.json(
      { error: "필수 항목을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  const result = await createCoupon({
    code: code.trim(),
    name: name.trim(),
    service_type: body.service_type || "all",
    discount_type,
    discount_amount: body.discount_amount || 0,
    total_quantity: Number(total_quantity),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, action: toggleAction, ...updateData } = body;

  if (!id) {
    return NextResponse.json(
      { error: "쿠폰 ID가 필요합니다." },
      { status: 400 }
    );
  }

  if (toggleAction === "toggle") {
    const result = await toggleCouponActive(id, updateData.is_active);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  }

  const result = await updateCoupon(id, updateData);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "쿠폰 ID가 필요합니다." },
      { status: 400 }
    );
  }

  const result = await deleteCoupon(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
