import { NextRequest, NextResponse } from "next/server";
import { verifyOchoRequest } from "@/lib/ocho/auth";
import {
  getAffiliate,
  createTrial,
  getIdempotencyResponse,
  saveIdempotencyResponse,
} from "@/lib/db/ochoDB";

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SESAA-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/ocho/affiliates/{affiliateId}/trials — 무료 체험 부여
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string }> }
) {
  const rawBody = await request.text();
  const auth = await verifyOchoRequest(request, rawBody);
  if (!auth.ok) return auth.error;

  const { campaignId, requestId, isTestMode } = auth.context;
  const { affiliateId } = await params;

  // 멱등성 체크
  const cached = await getIdempotencyResponse(requestId, campaignId);
  if (cached) {
    return NextResponse.json(cached.body, { status: cached.status });
  }

  // 어필리에이트 존재 확인
  const affiliate = await getAffiliate(affiliateId, campaignId);
  if (!affiliate) {
    return NextResponse.json(
      { error: { code: "affiliate_not_found", message: "해당 어필리에이트를 찾을 수 없습니다" } },
      { status: 404 }
    );
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { plan, duration_days, usage_limit, auto_convert } = body;

  if (!plan) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "plan은 필수입니다" } },
      { status: 400 }
    );
  }

  const now = new Date();
  const expiresAt = duration_days
    ? new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const couponCode = generateCouponCode();

  if (isTestMode) {
    const testResponse = {
      trial_id: "test_trial_001",
      affiliate_id: affiliateId,
      status: "active",
      activation_type: "both",
      starts_at: now.toISOString(),
      expires_at: expiresAt,
      usage: { used: 0, limit: usage_limit || null },
      access_url: `https://fortuneteller.co.kr/trial/test_trial_001`,
      coupon_code: couponCode,
      _test_mode: true,
    };
    return NextResponse.json(testResponse, { status: 201 });
  }

  const trial = await createTrial({
    affiliate_id: affiliateId,
    campaign_id: campaignId,
    plan,
    duration_days: duration_days || null,
    usage_limit: usage_limit || null,
    auto_convert: auto_convert || false,
    activation_type: "both",
    starts_at: now.toISOString(),
    expires_at: expiresAt,
    coupon_code: couponCode,
  });

  if (!trial) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "트라이얼 생성 실패" } },
      { status: 500 }
    );
  }

  // access_url 업데이트
  const accessUrl = `https://fortuneteller.co.kr/trial/${trial.id}`;
  const { updateTrial } = await import("@/lib/db/ochoDB");
  await updateTrial(trial.id, affiliateId, campaignId, { access_url: accessUrl });

  const responseBody = {
    trial_id: trial.id,
    affiliate_id: trial.affiliate_id,
    status: trial.status,
    activation_type: trial.activation_type,
    starts_at: trial.starts_at,
    expires_at: trial.expires_at,
    usage: { used: 0, limit: trial.usage_limit },
    access_url: accessUrl,
    coupon_code: trial.coupon_code,
  };

  await saveIdempotencyResponse(requestId, campaignId, 201, responseBody);
  return NextResponse.json(responseBody, { status: 201 });
}
