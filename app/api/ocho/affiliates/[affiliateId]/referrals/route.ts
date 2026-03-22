import { NextRequest, NextResponse } from "next/server";
import { verifyOchoRequest } from "@/lib/ocho/auth";
import {
  getAffiliate,
  createReferral,
  getIdempotencyResponse,
  saveIdempotencyResponse,
} from "@/lib/db/ochoDB";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://fortuneteller.co.kr";

function generateReferralCode(handle: string, prefix?: string): string {
  const base = prefix || handle.replace("@", "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${base}${random}`;
}

function buildPlatformLinks(
  code: string,
  productId: string,
  platforms: string[]
): Record<string, Array<{ product: string; url: string }>> {
  const links: Record<string, Array<{ product: string; url: string }>> = {};
  const productName = productId === "all" ? "사주운세" : productId;

  for (const platform of platforms) {
    links[platform] = [
      {
        product: productName,
        url: `${BASE_URL}/?ref=${code}&utm_medium=${platform}`,
      },
    ];
  }

  return links;
}

// POST /api/ocho/affiliates/{affiliateId}/referrals — 레퍼럴 코드/링크 생성
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

  const { product_id, platform, tracking_type, code_config, commission } = body;

  if (!commission || !commission.type || commission.value === undefined) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "commission 정보는 필수입니다" } },
      { status: 400 }
    );
  }

  const code = generateReferralCode(
    affiliate.handle || affiliate.name,
    code_config?.prefix
  );

  const allPlatforms = ["instagram", "youtube", "tiktok"];
  const linksPlatforms = platform ? [platform, ...allPlatforms.filter(p => p !== platform)] : allPlatforms;
  const links = buildPlatformLinks(code, product_id || "all", linksPlatforms);

  if (isTestMode) {
    const testResponse = {
      referral_id: "test_ref_001",
      code,
      primary_platform: platform || "instagram",
      links_by_platform: links,
      status: "active",
      commission: { type: commission.type, value: commission.value },
      _test_mode: true,
    };
    return NextResponse.json(testResponse, { status: 201 });
  }

  const referral = await createReferral({
    affiliate_id: affiliateId,
    campaign_id: campaignId,
    product_id: product_id || "all",
    platform: platform || "instagram",
    tracking_type: tracking_type || "both",
    code,
    links_by_platform: links,
    commission_type: commission.type,
    commission_value: commission.value,
    discount_type: code_config?.discount?.type,
    discount_value: code_config?.discount?.value,
  });

  if (!referral) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "레퍼럴 생성 실패" } },
      { status: 500 }
    );
  }

  const responseBody = {
    referral_id: referral.id,
    code: referral.code,
    primary_platform: referral.platform,
    links_by_platform: referral.links_by_platform,
    status: referral.status,
    commission: { type: referral.commission_type, value: referral.commission_value },
  };

  await saveIdempotencyResponse(requestId, campaignId, 201, responseBody);
  return NextResponse.json(responseBody, { status: 201 });
}
