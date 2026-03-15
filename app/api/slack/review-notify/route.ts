import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

const SERVICE_LABELS: Record<string, string> = {
  saju_love: "사주",
  new_year: "신년사주",
  couple: "궁합",
  face: "관상",
};

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.SLACK_REVIEW_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook URL not configured" }, { status: 500 });
  }

  try {
    const { serviceType, rating, content, recordId } = await request.json();

    const stars = "⭐".repeat(rating || 0);
    const serviceName = SERVICE_LABELS[serviceType] || serviceType;

    // DB에서 유저 정보 조회
    let userName = "-";
    let gender: string | null = null;
    let birthDate: string | null = null;
    let birthTime: string | null = null;

    if (recordId && (serviceType === "saju_love" || serviceType === "new_year")) {
      const { data } = await supabase
        .from("saju_analyses")
        .select("user_info")
        .eq("id", recordId)
        .single();

      if (data?.user_info) {
        const info = data.user_info as Record<string, string>;
        userName = info.userName || "-";
        gender = info.gender || null;
        birthDate = info.date || null;
        birthTime = info.time || null;
      }
    }

    const lines = [
      `*📝 새 리뷰가 등록됐어요!*`,
      `• 서비스: ${serviceName}`,
      `• 이름: ${userName}`,
      `• 별점: ${stars} (${rating}점)`,
    ];
    if (gender || birthDate) {
      const parts = [];
      if (gender) parts.push(gender === "male" ? "남" : "여");
      if (birthDate) parts.push(birthDate);
      if (birthTime) parts.push(birthTime);
      lines.push(`• 사주: ${parts.join(" / ")}`);
    }
    if (content) lines.push(`• 내용: ${content}`);

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("리뷰 Slack 알림 전송 실패:", error);
    return NextResponse.json({ error: "알림 전송 실패" }, { status: 500 });
  }
}
