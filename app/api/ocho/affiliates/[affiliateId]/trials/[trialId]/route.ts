import { NextRequest, NextResponse } from "next/server";
import { verifyOchoRequest } from "@/lib/ocho/auth";
import { getTrial, getAffiliate } from "@/lib/db/ochoDB";

// GET /api/ocho/affiliates/{affiliateId}/trials/{trialId} — 체험 상태 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string; trialId: string }> }
) {
  const auth = await verifyOchoRequest(request);
  if (!auth.ok) return auth.error;

  const { campaignId } = auth.context;
  const { affiliateId, trialId } = await params;

  // 캠페인 소속 확인
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

  // 만료 체크 — expires_at이 지났으면 status를 expired로 반환
  let status = trial.status;
  if (status === "active" && trial.expires_at && new Date(trial.expires_at) < new Date()) {
    status = "expired";
  }

  return NextResponse.json({
    trial_id: trial.id,
    status,
    expires_at: trial.expires_at,
    usage: { used: trial.usage_used, limit: trial.usage_limit },
  });
}
