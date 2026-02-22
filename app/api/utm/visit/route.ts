import { NextRequest, NextResponse } from "next/server";
import { recordVisit } from "@/lib/db/utmDB";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { utm_source, utm_medium, utm_campaign, landing_page } = body;

    if (!utm_source) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    await recordVisit({ utm_source, utm_medium, utm_campaign, landing_page });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
