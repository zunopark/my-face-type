import { NextRequest, NextResponse } from "next/server";
import { verifyOchoRequest } from "@/lib/ocho/auth";
import { getAffiliate, getReferralStats } from "@/lib/db/ochoDB";

// GET /api/ocho/affiliates/{affiliateId}/referrals/{referralId}/stats — 매출/정산 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string; referralId: string }> }
) {
  const auth = await verifyOchoRequest(request);
  if (!auth.ok) return auth.error;

  const { campaignId } = auth.context;
  const { affiliateId, referralId } = await params;

  const affiliate = await getAffiliate(affiliateId, campaignId);
  if (!affiliate) {
    return NextResponse.json(
      { error: { code: "affiliate_not_found", message: "해당 어필리에이트를 찾을 수 없습니다" } },
      { status: 404 }
    );
  }

  const stats = await getReferralStats(referralId, affiliateId, campaignId);
  if (!stats) {
    return NextResponse.json(
      { error: { code: "referral_not_found", message: "해당 레퍼럴을 찾을 수 없습니다" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    referral_id: stats.referral_id,
    stats: {
      revenue: stats.revenue,
      commission_earned: stats.commission_earned,
      currency: stats.currency,
    },
  });
}
