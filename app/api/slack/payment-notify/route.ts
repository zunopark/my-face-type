import { NextRequest, NextResponse } from "next/server";

const SERVICE_LABELS: Record<string, string> = {
  saju_love: "연애사주",
  new_year: "신년사주",
  couple: "궁합",
  face: "관상",
};

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook URL not configured" }, { status: 500 });
  }

  try {
    const { serviceType, userName, amount, couponCode, influencerName, gender, birthDate, birthTime, wish } = await request.json();

    const serviceName = SERVICE_LABELS[serviceType] || serviceType;
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    const lines = [
      `*💰 새 결제가 들어왔어요!*`,
      `• 서비스: ${serviceName}`,
      `• 이름: ${userName || "-"}`,
      `• 금액: ${Number(amount).toLocaleString()}원`,
    ];
    if (gender || birthDate) {
      const parts = [];
      if (gender) parts.push(gender === "male" ? "남" : "여");
      if (birthDate) parts.push(birthDate);
      if (birthTime) parts.push(birthTime);
      lines.push(`• 사주: ${parts.join(" / ")}`);
    }
    if (influencerName) lines.push(`• 인플루언서: ${influencerName}`);
    if (couponCode) lines.push(`• 쿠폰: ${couponCode}`);
    if (wish) lines.push(`• 고민: ${wish}`);
    lines.push(`• 시간: ${now}`);

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Slack 알림 전송 실패:", error);
    return NextResponse.json({ error: "알림 전송 실패" }, { status: 500 });
  }
}
