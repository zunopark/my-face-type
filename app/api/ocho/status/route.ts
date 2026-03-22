import { NextResponse } from "next/server";

// GET /api/ocho/status — Ocho 연동 설정 현황 확인
export async function GET() {
  const partnerKey = process.env.OCHO_PARTNER_API_KEY || "";
  const sharedSecret = process.env.OCHO_SHARED_SECRET || "";
  const campaignId = process.env.OCHO_CAMPAIGN_ID || "sesaa2026";

  const mask = (key: string) => {
    if (!key || key.includes("여기에")) return "❌ 미설정";
    if (key.length <= 12) return key.slice(0, 4) + "****";
    return key.slice(0, 16) + "****" + key.slice(-4);
  };

  const endpoints = [
    { method: "POST", path: "/api/ocho/affiliates", description: "어필리에이트 등록" },
    { method: "PATCH", path: "/api/ocho/affiliates/{id}", description: "어필리에이트 수정" },
    { method: "GET", path: "/api/ocho/affiliates/{id}", description: "어필리에이트 조회" },
    { method: "POST", path: "/api/ocho/affiliates/{id}/trials", description: "무료 체험 부여" },
    { method: "GET", path: "/api/ocho/affiliates/{id}/trials/{trialId}", description: "체험 상태 조회" },
    { method: "POST", path: "/api/ocho/affiliates/{id}/trials/{trialId}/reset", description: "체험 초기화/연장" },
    { method: "POST", path: "/api/ocho/affiliates/{id}/referrals", description: "레퍼럴 코드 생성" },
    { method: "GET", path: "/api/ocho/affiliates/{id}/referrals/{refId}/stats", description: "매출/정산 조회" },
  ];

  return NextResponse.json({
    service: "Ocho Affiliation API",
    campaign_id: campaignId,
    keys: {
      partner_api_key: mask(partnerKey),
      shared_secret: mask(sharedSecret),
    },
    status: {
      partner_api_key: partnerKey && !partnerKey.includes("여기에") ? "✅ 설정됨" : "❌ 미설정",
      shared_secret: sharedSecret && !sharedSecret.includes("여기에") ? "✅ 설정됨" : "❌ 미설정 (Ocho에서 받아야 함)",
    },
    endpoints,
  });
}
