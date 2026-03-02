import { NextRequest, NextResponse } from "next/server";
import {
  getAllInfluencersWithStats,
  getInfluencerBySlug,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
} from "@/lib/db/influencerDB";
import { getPaymentsByInfluencer } from "@/lib/db/utmDB";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const payments = request.nextUrl.searchParams.get("payments");
  const adminId = request.nextUrl.searchParams.get("admin_id") || undefined;

  if (payments) {
    const data = await getPaymentsByInfluencer(payments);
    return NextResponse.json(data);
  }

  if (slug) {
    const influencer = await getInfluencerBySlug(slug);
    if (!influencer) {
      return NextResponse.json({ error: "인플루언서를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(influencer);
  }

  const influencers = await getAllInfluencersWithStats(adminId);
  return NextResponse.json(influencers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, platform, contact, memo, rs_percentage, password, admin_id } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "이름과 슬러그는 필수입니다." },
        { status: 400 }
      );
    }

    const result = await createInfluencer({
      name,
      slug,
      platform,
      contact,
      memo,
      rs_percentage,
      password,
      admin_id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "요청 처리 실패" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, admin_id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 });
    }

    // 빈 비밀번호는 업데이트에서 제외 (기존 유지)
    if ("password" in updates && !updates.password) {
      delete updates.password;
    }

    const result = await updateInfluencer(id, updates, admin_id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "요청 처리 실패" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const adminId = request.nextUrl.searchParams.get("admin_id") || undefined;
  if (!id) {
    return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 });
  }

  const result = await deleteInfluencer(id, adminId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
