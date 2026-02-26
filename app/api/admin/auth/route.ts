import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!password) {
    return NextResponse.json(
      { authenticated: false, error: "비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("admin_accounts")
    .select("id, name")
    .eq("password", password)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { authenticated: false, error: "비밀번호가 일치하지 않습니다." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    account: { id: data.id, name: data.name },
  });
}
