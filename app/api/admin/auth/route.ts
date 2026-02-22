import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!password) {
    return NextResponse.json(
      { authenticated: false, error: "비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { authenticated: false, error: "서버 설정 오류" },
      { status: 500 }
    );
  }

  if (password === adminPassword) {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json(
    { authenticated: false, error: "비밀번호가 일치하지 않습니다." },
    { status: 401 }
  );
}
