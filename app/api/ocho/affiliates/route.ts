import { NextRequest, NextResponse } from "next/server";
import { verifyOchoRequest } from "@/lib/ocho/auth";
import {
  createAffiliate,
  getIdempotencyResponse,
  saveIdempotencyResponse,
} from "@/lib/db/ochoDB";

// POST /api/ocho/affiliates — 어필리에이트 등록
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const auth = await verifyOchoRequest(request, rawBody);
  if (!auth.ok) return auth.error;

  const { campaignId, requestId, isTestMode } = auth.context;

  // 멱등성 체크
  const cached = await getIdempotencyResponse(requestId, campaignId);
  if (cached) {
    return NextResponse.json(cached.body, { status: cached.status });
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

  const { external_id, email, name, profile, metadata } = body;

  // 필수 필드 검증
  if (!external_id || !email || !name) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "external_id, email, name은 필수입니다" } },
      { status: 400 }
    );
  }

  // 테스트 모드
  if (isTestMode) {
    const testResponse = {
      affiliate_id: "test_dry_run_001",
      external_id,
      status: "active",
      created_at: new Date().toISOString(),
      credentials: null,
      _test_mode: true,
    };
    return NextResponse.json(testResponse, { status: 201 });
  }

  const result = await createAffiliate({
    external_id,
    campaign_id: campaignId,
    email,
    name,
    platform: profile?.platform,
    handle: profile?.handle,
    followers: profile?.followers,
    profile_url: profile?.profile_url,
    metadata: metadata || {},
    credentials: null,
  });

  if (!result.success) {
    if (result.error === "affiliate_already_exists" && result.existing) {
      const conflictBody = {
        affiliate_id: result.existing.id,
        external_id: result.existing.external_id,
        status: result.existing.status,
        created_at: result.existing.created_at,
        credentials: result.existing.credentials,
      };
      await saveIdempotencyResponse(requestId, campaignId, 409, conflictBody);
      return NextResponse.json(conflictBody, { status: 409 });
    }

    return NextResponse.json(
      { error: { code: "invalid_request", message: result.error } },
      { status: 500 }
    );
  }

  const responseBody = {
    affiliate_id: result.affiliate.id,
    external_id: result.affiliate.external_id,
    status: result.affiliate.status,
    created_at: result.affiliate.created_at,
    credentials: result.affiliate.credentials,
  };

  await saveIdempotencyResponse(requestId, campaignId, 201, responseBody);
  return NextResponse.json(responseBody, { status: 201 });
}
