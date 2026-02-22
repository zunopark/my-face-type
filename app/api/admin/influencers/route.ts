import { NextRequest, NextResponse } from "next/server";
import {
  getAllInfluencersWithStats,
  getInfluencerBySlug,
  createInfluencer,
  updateInfluencer,
  deleteInfluencer,
} from "@/lib/db/influencerDB";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (slug) {
    const influencer = await getInfluencerBySlug(slug);
    if (!influencer) {
      return NextResponse.json({ error: "인플루언서를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json(influencer);
  }

  const influencers = await getAllInfluencersWithStats();
  return NextResponse.json(influencers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, platform, contact, memo, rs_percentage } = body;

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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 });
    }

    const result = await updateInfluencer(id, updates);
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
  if (!id) {
    return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 });
  }

  const result = await deleteInfluencer(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
