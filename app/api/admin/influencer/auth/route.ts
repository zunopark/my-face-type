import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { slug, password } = await request.json();

    if (!slug || !password) {
      return NextResponse.json(
        { authenticated: false, error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("influencers")
      .select("id, name, slug, rs_percentage, is_active, password")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { authenticated: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    if (!data.password || data.password !== password) {
      return NextResponse.json(
        { authenticated: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      influencer: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        rs_percentage: data.rs_percentage,
      },
    });
  } catch {
    return NextResponse.json(
      { authenticated: false, error: "서버 오류" },
      { status: 500 }
    );
  }
}
