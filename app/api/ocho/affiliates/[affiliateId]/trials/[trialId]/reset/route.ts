import { NextRequest, NextResponse } from "next/server";
import { verifyOchoRequest } from "@/lib/ocho/auth";
import {
  getAffiliate,
  getTrial,
  updateTrial,
  getIdempotencyResponse,
  saveIdempotencyResponse,
} from "@/lib/db/ochoDB";

// POST /api/ocho/affiliates/{affiliateId}/trials/{trialId}/reset — 체험 초기화/연장
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string; trialId: string }> }
) {
  const rawBody = await request.text();
  const auth = await verifyOchoRequest(request, rawBody);
  if (!auth.ok) return auth.error;

  const { campaignId, requestId, isTestMode } = auth.context;
  const { affiliateId, trialId } = await params;

  // 멱등성 체크
  const cached = await getIdempotencyResponse(requestId, campaignId);
  if (cached) {
    return NextResponse.json(cached.body, { status: cached.status });
  }

  const affiliate = await getAffiliate(affiliateId, campaignId);
  if (!affiliate) {
    return NextResponse.json(
      { error: { code: "affiliate_not_found", message: "해당 어필리에이트를 찾을 수 없습니다" } },
      { status: 404 }
    );
  }

  const trial = await getTrial(trialId, affiliateId, campaignId);
  if (!trial) {
    return NextResponse.json(
      { error: { code: "trial_not_found", message: "해당 트라이얼을 찾을 수 없습니다" } },
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

  const { reset_type, extend_days } = body;

  if (!reset_type || !["full", "extend", "usage_only"].includes(reset_type)) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "reset_type은 full, extend, usage_only 중 하나여야 합니다" } },
      { status: 400 }
    );
  }

  if (reset_type === "extend" && !extend_days) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "extend 타입은 extend_days가 필수입니다" } },
      { status: 400 }
    );
  }

  if (isTestMode) {
    const testResponse = {
      trial_id: trialId,
      status: "active",
      expires_at: trial.expires_at,
      usage: { used: 0, limit: trial.usage_limit },
      _test_mode: true,
    };
    return NextResponse.json(testResponse, { status: 200 });
  }

  const updates: Record<string, unknown> = { status: "active" };

  if (reset_type === "full") {
    const now = new Date();
    updates.starts_at = now.toISOString();
    updates.usage_used = 0;
    if (trial.duration_days) {
      updates.expires_at = new Date(now.getTime() + trial.duration_days * 24 * 60 * 60 * 1000).toISOString();
    }
  } else if (reset_type === "extend") {
    const baseDate = trial.expires_at ? new Date(trial.expires_at) : new Date();
    updates.expires_at = new Date(baseDate.getTime() + extend_days * 24 * 60 * 60 * 1000).toISOString();
  } else if (reset_type === "usage_only") {
    updates.usage_used = 0;
  }

  const updated = await updateTrial(trialId, affiliateId, campaignId, updates);

  if (!updated) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "트라이얼 리셋 실패" } },
      { status: 500 }
    );
  }

  const responseBody = {
    trial_id: updated.id,
    status: updated.status,
    expires_at: updated.expires_at,
    usage: { used: updated.usage_used, limit: updated.usage_limit },
  };

  await saveIdempotencyResponse(requestId, campaignId, 200, responseBody);
  return NextResponse.json(responseBody);
}
