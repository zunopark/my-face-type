import { NextRequest, NextResponse } from "next/server";
import { verifyOchoRequest } from "@/lib/ocho/auth";
import {
  getAffiliate,
  updateAffiliate,
  getIdempotencyResponse,
  saveIdempotencyResponse,
} from "@/lib/db/ochoDB";

// GET /api/ocho/affiliates/{affiliateId} — 어필리에이트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string }> }
) {
  const auth = await verifyOchoRequest(request);
  if (!auth.ok) return auth.error;

  const { affiliateId } = await params;
  const affiliate = await getAffiliate(affiliateId, auth.context.campaignId);

  if (!affiliate) {
    return NextResponse.json(
      { error: { code: "affiliate_not_found", message: "해당 어필리에이트를 찾을 수 없습니다" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    affiliate_id: affiliate.id,
    external_id: affiliate.external_id,
    email: affiliate.email,
    name: affiliate.name,
    profile: {
      platform: affiliate.platform,
      handle: affiliate.handle,
      followers: affiliate.followers,
      profile_url: affiliate.profile_url,
    },
    status: affiliate.status,
    metadata: affiliate.metadata,
    credentials: affiliate.credentials,
    created_at: affiliate.created_at,
    updated_at: affiliate.updated_at,
  });
}

// PATCH /api/ocho/affiliates/{affiliateId} — 어필리에이트 수정
export async function PATCH(
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

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  // 존재 확인
  const existing = await getAffiliate(affiliateId, campaignId);
  if (!existing) {
    return NextResponse.json(
      { error: { code: "affiliate_not_found", message: "해당 어필리에이트를 찾을 수 없습니다" } },
      { status: 404 }
    );
  }

  if (isTestMode) {
    const testResponse = {
      affiliate_id: affiliateId,
      external_id: existing.external_id,
      status: existing.status,
      updated_at: new Date().toISOString(),
      _test_mode: true,
    };
    return NextResponse.json(testResponse, { status: 200 });
  }

  // 업데이트할 필드 추출
  const updates: Record<string, unknown> = {};
  if (body.email) updates.email = body.email;
  if (body.name) updates.name = body.name;
  if (body.profile) {
    if (body.profile.platform) updates.platform = body.profile.platform;
    if (body.profile.handle) updates.handle = body.profile.handle;
    if (body.profile.followers !== undefined) updates.followers = body.profile.followers;
    if (body.profile.profile_url) updates.profile_url = body.profile.profile_url;
  }
  if (body.metadata) updates.metadata = body.metadata;
  if (body.credentials !== undefined) updates.credentials = body.credentials;

  const updated = await updateAffiliate(affiliateId, campaignId, updates);

  if (!updated) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "업데이트 실패" } },
      { status: 500 }
    );
  }

  const responseBody = {
    affiliate_id: updated.id,
    external_id: updated.external_id,
    email: updated.email,
    name: updated.name,
    profile: {
      platform: updated.platform,
      handle: updated.handle,
      followers: updated.followers,
      profile_url: updated.profile_url,
    },
    status: updated.status,
    metadata: updated.metadata,
    credentials: updated.credentials,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };

  await saveIdempotencyResponse(requestId, campaignId, 200, responseBody);
  return NextResponse.json(responseBody);
}
