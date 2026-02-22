import { NextRequest, NextResponse } from "next/server";
import { getMonthlySettlement } from "@/lib/db/utmDB";

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");

  const now = new Date();
  const year = yearParam ? parseInt(yearParam) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1;

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "유효하지 않은 연/월 값입니다." },
      { status: 400 }
    );
  }

  try {
    const data = await getMonthlySettlement(year, month);
    return NextResponse.json(data);
  } catch (err) {
    console.error("정산 데이터 조회 오류:", err);
    return NextResponse.json(
      { error: "정산 데이터 조회 실패" },
      { status: 500 }
    );
  }
}
